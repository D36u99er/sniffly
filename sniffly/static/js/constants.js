// Constants for Claude Analytics Dashboard

// User interruption patterns
const USER_INTERRUPTION_PREFIX = '[用户在工具使用时中断请求]';
const USER_INTERRUPTION_API_ERROR = 'API 错误：请求被中止。';
const USER_INTERRUPTION_PATTERNS = [
  USER_INTERRUPTION_PREFIX,
  USER_INTERRUPTION_API_ERROR
];

// Pagination defaults
const DEFAULT_MESSAGES_PER_PAGE = 20;
const DEFAULT_COMMANDS_PER_PAGE = 20;

// Chart colors
const CHART_COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#48bb78',
  warning: '#ed8936',
  danger: '#f56565',
  info: '#4299e1'
};

// Claude logs location info
const CLAUDE_LOGS_TOOLTIP = `<div class="example">
    <strong>示例：</strong><br>
    项目：/Users/john/dev/myapp<br>
    日志位置：~/.claude/projects/-Users-john-dev-myapp/
</div>`;

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    USER_INTERRUPTION_PREFIX,
    USER_INTERRUPTION_API_ERROR,
    USER_INTERRUPTION_PATTERNS,
    DEFAULT_MESSAGES_PER_PAGE,
    DEFAULT_COMMANDS_PER_PAGE,
    CHART_COLORS,
    CLAUDE_LOGS_TOOLTIP
  };
}