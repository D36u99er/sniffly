// Stats cards module - shared between dashboard.html and share-viewer.js

window.StatsCardsModule = {
  displayOverviewStats: function(statistics) {
    const overview = statistics.overview;
    const messageTypes = overview.message_types;
        
    const statsHTML = `
            <div class="stat-card">
                <h3>用户命令</h3>
                <div class="value">${statistics.user_interactions ? statistics.user_interactions.user_commands_analyzed : 0}</div>
                <div class="breakdown">
                    <span>${statistics.user_interactions ? statistics.user_interactions.avg_tokens_per_command.toFixed(1) : '0.0'} 令牌/命令</span>
                    <span>${(() => {
                        if (!statistics.user_interactions) return '0 books';
                        const totalWords = statistics.user_interactions.user_commands_analyzed * 
                                         statistics.user_interactions.avg_tokens_per_command * 
                                         3 / 4;  // tokens to words (3/4 ratio)
                        const books = totalWords / 60000;  // 60k words per book
                        return books >= 1 ? `${books.toFixed(1)} 本书` : `${books.toFixed(2)} 本书`;
                    })()}
                        <span class="tooltip-info-icon"
                              onmouseover="showTooltip('books-tooltip')" 
                              onmouseout="hideTooltip('books-tooltip')">ⓘ
                            <div id="books-tooltip" class="tooltip-dark position-below tooltip-sm">
                                您本可以写的书籍数量。
                                假设每本书 60k 字。
                            </div>
                        </span>
                    </span>
                    <span>${StatsModule.calculateDaysInclusive(statistics)} 天</span>
                    ${(() => {
                        // Show context info if there are compact summaries
                        const compactSummaryCount = messageTypes.compact_summary || 0;
                        if (compactSummaryCount > 0 && statistics.user_interactions) {
                            const commandsPerContext = Math.floor(statistics.user_interactions.user_commands_analyzed / compactSummaryCount);
                            return `<span>${commandsPerContext} 命令/完整上下文</span>`;
                        }
                        return '';
                    })()}
                </div>
            </div>

            <div class="stat-card">
                <h3>用户中断率
                    <span class="tooltip-info-icon"
                          onmouseover="showTooltip('interruption-tooltip')" 
                          onmouseout="hideTooltip('interruption-tooltip')">ⓘ</span>
                    <div id="interruption-tooltip" class="tooltip-dark position-below tooltip-sm">
                        <div style="font-size: 0.75rem; opacity: 0.9;">
                            导致需要手动干预的工具操作的指令百分比。
                        </div>
                    </div>
                </h3>
                <div class="value">${statistics.user_interactions.interruption_rate || 0}%</div>
                <div class="subtext">${statistics.user_interactions.commands_followed_by_interruption || 0} / ${statistics.user_interactions.non_interruption_commands || 0} 条命令</div>
            </div>
            
            ${statistics.user_interactions ? `
            <div class="stat-card">
                <h3>每命令步骤数</h3>
                <div class="value">${statistics.user_interactions.avg_steps_per_command}</div>
                <div class="breakdown">
                    <span>${statistics.user_interactions.avg_tools_per_command} 工具/命令</span>
                    <span>最长链：${Math.max(...(statistics.user_interactions.command_details || []).map(cmd => cmd.assistant_steps || 0))} 步</span>
                </div>
            </div>
            
            <div class="stat-card">
                <h3>工具使用率
                    <span class="tooltip-info-icon"
                          onmouseover="showTooltip('tools-required-tooltip')" 
                          onmouseout="hideTooltip('tools-required-tooltip')">ⓘ</span>
                    <div id="tools-required-tooltip" class="tooltip-dark position-below tooltip-sm">
                        <div style="margin-bottom: 0.5rem;">仅计算实际的用户命令（不包括中断）。</div>
                        <div style="margin-bottom: 0.25rem;">这是 AI 实际使用的工具数（不是它打算使用的工具），在任务完成或用户中断之前。</div>
                    </div>
                </h3>
                <div class="value">${statistics.user_interactions.percentage_requiring_tools}%</div>
                <div class="subtext">${statistics.user_interactions.commands_requiring_tools} / ${statistics.user_interactions.non_interruption_commands} 条命令</div>
                <div class="breakdown">
                    <span>${StatsModule.calculateDistinctTools(statistics)} 个工具</span>
                    <span>${StatsModule.calculateTotalToolCalls(statistics).toLocaleString()} 次工具调用</span>
                    ${statistics.user_interactions.search_tool_percentage !== undefined ? 
                        `<span>${statistics.user_interactions.search_tool_percentage}% 搜索</span>` : 
                        ''
                    }
                </div>
            </div>

            <div class="stat-card">
                <h3>项目成本
                    <span class="tooltip-info-icon"
                          onmouseover="showTooltip('total-cost-tooltip')" 
                          onmouseout="hideTooltip('total-cost-tooltip')">ⓘ</span>
                    <div id="total-cost-tooltip" class="tooltip-dark position-below tooltip-sm">
                        <div style="font-size: 0.85rem; line-height: 1.4;">
                            如果您直接使用 Claude API 您将支付的费用。
                        </div>
                        <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.5rem;">
                            基于 LiteLLM 的当前令牌价格
                        </div>
                    </div>
                </h3>
                <div class="value">
                    ${(() => {
    // Use pre-calculated total cost from statistics
    const totalCost = statistics.overview.total_cost;
    if (totalCost !== null && totalCost !== undefined) {
      return window.PricingUtils ? window.PricingUtils.formatCost(totalCost) : `$${totalCost.toFixed(2)}`;
    }
    return '$0.00';
  })()}
                </div>
                <div class="breakdown">
                    <span>总令牌数：${formatNumber(overview.total_tokens.input + overview.total_tokens.output)}</span>
                    <span>输入：${formatNumber(overview.total_tokens.input)}</span>
                    <span>输出：${formatNumber(overview.total_tokens.output)}</span>
                </div>
            </div>

            <div class="stat-card">
                <h3>提示缓存读取
                    <span class="tooltip-info-icon"
                          onmouseover="showTooltip('cache-stats-tooltip')" 
                          onmouseout="hideTooltip('cache-stats-tooltip')">ⓘ</span>
                    <div id="cache-stats-tooltip" class="tooltip-dark position-below tooltip-sm">
                        <div style="margin-bottom: 0.5rem;"><strong>命中率：</strong>使用缓存内容的助手消息百分比</div>
                        <div><strong>节省成本：</strong>计算为 (读取 × 0.9) - (创建 × 0.25) 基础令牌单位。缓存创建成本增加 25%，但读取成本减少 90%。</div>
                    </div>
                </h3>
                <div class="value">${formatNumber(overview.total_tokens.cache_read)}</div>
                <div class="breakdown">
                    <span>${overview.total_messages.toLocaleString()} 条消息总计</span>
                    <span>创建：${formatNumber(overview.total_tokens.cache_creation)}</span>
                    <span>缓存命中率：${statistics.cache ? statistics.cache.hit_rate : 0}%</span>
                </div>
            </div>
            ` : ''}
        `;
        
    document.getElementById('overview-stats').innerHTML = statsHTML;
  }
};

// Helper function - copied from main dashboard
function formatNumber(num) {
  if (!num) {return '0';}
  if (num >= 1000000) {return (num / 1000000).toFixed(1) + 'M';}
  if (num >= 1000) {return (num / 1000).toFixed(1) + 'K';}
  return num.toLocaleString();
}