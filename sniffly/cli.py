import asyncio
import json
import logging
import os
import sys
import threading
import time
import webbrowser
from datetime import datetime
from pathlib import Path

import click

from . import __version__
from .config import Config
from .utils.logging import setup_logging

# Set up logging
setup_logging()
logger = logging.getLogger(__name__)


def _setup_event_loop_policy():
    """Set up optimized event loop policy based on platform"""
    try:
        if sys.platform == 'win32':
            # Use winloop on Windows
            import winloop
            asyncio.set_event_loop_policy(winloop.EventLoopPolicy())
            logger.debug("Using winloop event loop policy on Windows")
        else:
            # Use uvloop on other platforms (Linux, macOS)
            import uvloop
            asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
            logger.debug("Using uvloop event loop policy")
    except ImportError as e:
        logger.warning(f"设置优化事件循环策略失败：{e}")
        logger.warning("回退到默认的 asyncio 事件循环策略")


@click.group()
def cli():
    """Sniffly - Claude Code 分析工具"""
    pass


@cli.command()
@click.option("--port", type=int, help="服务器运行端口")
@click.option("--no-browser", is_flag=True, help="不自动打开浏览器")
@click.option("--clear-cache", is_flag=True, help="启动前清除所有缓存")
def init(port, no_browser, clear_cache):
    """启动分析仪表板"""
    # Clear cache if requested
    if clear_cache:
        import shutil
        from pathlib import Path

        # Clear local cache directory
        cache_dir = Path.home() / ".sniffly" / "cache"
        if cache_dir.exists():
            shutil.rmtree(cache_dir)
            click.echo(f"✅ 已清除本地缓存：{cache_dir}")
        else:
            click.echo("ℹ️  未找到需要清除的本地缓存")

    # Check for first run
    if is_first_run():
        handle_first_run_setup()

    # Get configuration
    cfg = Config()

    # Use provided port or get from config
    if port is None:
        port = cfg.get("port")

    # Determine if we should open browser
    auto_browser = cfg.get("auto_browser")
    should_open_browser = auto_browser and not no_browser

    # Set up optimized event loop for better async performance
    _setup_event_loop_policy()

    # Start server in background thread
    from .server import start_server_with_args

    server_thread = threading.Thread(target=start_server_with_args, args=(port,), daemon=True)
    server_thread.start()

    # Wait for server to start
    time.sleep(1)

    # Open browser
    if should_open_browser:
        url = f"http://localhost:{port}"
        # Delay browser opening slightly to ensure server is ready
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
        click.echo(f"✨ Sniffly 仪表板已在 {url} 打开")
    else:
        click.echo(f"✨ Sniffly 运行在 http://localhost:{port}")

    click.echo("按 Ctrl+C 停止服务器")

    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        click.echo("\n👋 正在关闭...")


@cli.command()
def version():
    """显示版本信息"""
    click.echo(f"sniffly v{__version__}")


@cli.group()
def config():
    """管理配置设置"""
    pass


@config.command("show")
@click.option("--json", "as_json", is_flag=True, help="以 JSON 格式输出")
def show_config(as_json):
    """显示当前配置"""
    cfg = Config()
    config_data = cfg.get_all()

    if as_json:
        click.echo(json.dumps(config_data, indent=2))
    else:
        click.echo("当前配置：")
        for key, value in sorted(config_data.items()):
            # Show source of value
            env_key = Config.ENV_MAPPINGS.get(key, key.upper())
            if os.getenv(env_key) is not None:
                source = " (来自环境变量)"
            elif key in cfg._load_config_file():
                source = " (来自配置文件)"
            else:
                source = " (默认值)"
            click.echo(f"  {key}: {value}{source}")


@config.command("set")
@click.argument("key")
@click.argument("value")
def set_config(key, value):
    """设置配置值"""
    cfg = Config()

    # Validate key
    if key not in Config.DEFAULTS:
        click.echo(f"错误：未知的配置键 '{key}'")
        click.echo(f"有效的键：{', '.join(sorted(Config.DEFAULTS.keys()))}")
        return

    # Parse value based on type
    default = Config.DEFAULTS.get(key)
    if isinstance(default, bool):
        value = value.lower() in ("true", "1", "yes", "on")
    elif isinstance(default, int):
        try:
            value = int(value)
        except ValueError:
            click.echo(f"错误：{key} 必须是整数")
            return

    cfg.set(key, value)
    click.echo(f"✅ 已设置 {key} = {value}")


@config.command("unset")
@click.argument("key")
def unset_config(key):
    """移除配置值"""
    cfg = Config()
    cfg.unset(key)
    click.echo(f"✅ 已从配置文件移除 {key}")


@cli.command("clear-cache")
@click.argument("project", required=False)
def clear_cache(project):
    """清除内存缓存"""
    # For now, this requires server to be running
    # In future, we could implement IPC or file-based cache clearing
    click.echo("注意：清除缓存需要服务器正在运行。")
    click.echo("此功能将在未来版本中实现。")
    click.echo("")
    click.echo("目前，请重启服务器以清除缓存。")


@cli.command(name="help")
def show_help():
    """显示详细帮助和使用示例"""
    click.echo(
        """Sniffly - Claude Code 分析工具

使用示例：

  # 启动仪表板
  sniffly init
  
  # 在不同端口启动
  sniffly init --port 8090
  
  # 启动但不打开浏览器
  sniffly init --no-browser
  
  # 清除缓存并重新启动
  sniffly init --clear-cache
  
  # 显示配置
  sniffly config show
  
  # 设置配置值
  sniffly config set port 8090
  sniffly config set auto_browser false
  
  # 清除缓存
  sniffly init --clear-cache
  
  # 显示版本
  sniffly version

配置键：
  port                      - 服务器端口 (默认值: 8081)
  host                      - 服务器主机 (默认值: 127.0.0.1)
  cache_max_projects        - 内存缓存最大项目数 (默认值: 5)
  cache_max_mb_per_project  - 每个项目最大 MB 数 (默认值: 500)
  auto_browser              - 自动打开浏览器 (默认值: true)
  max_date_range_days       - 日期范围最大天数 (默认值: 30)
  messages_initial_load     - 初始加载消息数 (默认值: 500)
  enable_memory_monitor     - 启用内存监控 (默认值: false)
  enable_background_processing - 启用后台统计 (默认值: true)
  cache_warm_on_startup     - 启动时预热的项目数 (默认值: 3)

更多信息，请访问：https://sniffly.dev
"""
    )


def is_first_run():
    """Check if this is the first time running sniffly"""
    config_path = Path.home() / ".sniffly" / "config.json"
    return not config_path.exists()


def handle_first_run_setup():
    """Handle first-run setup"""
    click.echo("\n🍋 欢迎使用 Sniffly！")
    click.echo("您的 Claude Code 分析仪表板\n")

    # Save config for next time
    config_path = Path.home() / ".sniffly" / "config.json"
    config_path.parent.mkdir(exist_ok=True)
    config_path.write_text(json.dumps({"version": __version__, "first_run": datetime.now().isoformat()}))
