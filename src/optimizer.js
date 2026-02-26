function generateOptimizations(data) {
  const tips = [];
  const { totals, sessions, modelBreakdown, toolStats, dailyUsage } = data;

  if (totals.totalSessions === 0) return tips;

  // 1. Cache hit rate
  if (totals.cacheHitRate < 0.5 && totals.totalSessions > 3) {
    tips.push({
      id: 'low-cache-hit',
      icon: 'cache',
      title: 'Low cache hit rate',
      description: `Your cache hit rate is ${(totals.cacheHitRate * 100).toFixed(0)}%. Try keeping sessions open longer instead of starting new ones frequently. Claude Code caches your conversation context — reusing a session means less re-reading.`,
      impact: 'high',
    });
  } else if (totals.cacheHitRate >= 0.8 && totals.totalSessions > 3) {
    tips.push({
      id: 'great-cache',
      icon: 'check',
      title: 'Great cache reuse',
      description: `Your cache hit rate is ${(totals.cacheHitRate * 100).toFixed(0)}% — you're efficiently reusing conversation context. Keep it up!`,
      impact: 'positive',
    });
  }

  // 2. Short sessions
  const shortSessions = sessions.filter(s => s.queryCount <= 3);
  if (shortSessions.length > sessions.length * 0.5 && sessions.length > 5) {
    tips.push({
      id: 'many-short-sessions',
      icon: 'session',
      title: 'Many short sessions',
      description: `${shortSessions.length} of your ${sessions.length} sessions have 3 or fewer turns. Each new session requires Claude to re-read your project context. Try staying in one session for related tasks.`,
      impact: 'medium',
    });
  }

  // 3. Heavy tool usage
  const avgToolDensity = sessions.reduce((s, x) => s + x.toolDensity, 0) / sessions.length;
  if (avgToolDensity > 3 && totals.totalQueries > 10) {
    tips.push({
      id: 'high-tool-density',
      icon: 'tool',
      title: 'High tool usage per turn',
      description: `Claude averages ${avgToolDensity.toFixed(1)} tool calls per response. Providing more context upfront (paste relevant code, describe file locations) can help Claude work with fewer tool calls.`,
      impact: 'medium',
    });
  }

  // 4. Thinking usage
  if (totals.totalThinkingTurns > 0 && totals.totalQueries > 0) {
    const thinkingRatio = totals.totalThinkingTurns / totals.totalQueries;
    if (thinkingRatio > 0.3) {
      tips.push({
        id: 'heavy-thinking',
        icon: 'think',
        title: 'Extended thinking is active often',
        description: `${(thinkingRatio * 100).toFixed(0)}% of responses use extended thinking. For simpler tasks (renaming, small edits), try using /fast mode to skip extended thinking and get faster responses.`,
        impact: 'low',
      });
    }
  }

  // 5. Model usage — Opus heavy
  const opusModels = modelBreakdown.filter(m => m.model.toLowerCase().includes('opus'));
  const opusTokens = opusModels.reduce((s, m) => s + m.totalTokens, 0);
  if (opusTokens > totals.totalTokens * 0.5 && totals.totalTokens > 0) {
    tips.push({
      id: 'opus-heavy',
      icon: 'model',
      title: 'Heavy Opus usage',
      description: `${((opusTokens / totals.totalTokens) * 100).toFixed(0)}% of your tokens go to Opus models. Sonnet handles most coding tasks well and uses fewer tokens per turn. Consider reserving Opus for complex architecture decisions.`,
      impact: 'medium',
    });
  }

  // 6. Single project dominance
  if (data.projects.length > 1) {
    const topProject = data.projects[0];
    const ratio = topProject.totalTokens / totals.totalTokens;
    if (ratio > 0.7) {
      tips.push({
        id: 'project-concentration',
        icon: 'project',
        title: 'Concentrated on one project',
        description: `${(ratio * 100).toFixed(0)}% of your tokens go to "${formatProjectName(topProject.project)}". This is typical for focused work — just be aware this project drives most of your usage.`,
        impact: 'info',
      });
    }
  }

  // 7. Large input-to-output ratio
  if (totals.totalOutput > 0 && totals.totalInput > 0) {
    const totalInputAll = totals.totalInput + totals.totalCacheCreation + totals.totalCacheRead;
    const ratio = totalInputAll / totals.totalOutput;
    if (ratio > 20) {
      tips.push({
        id: 'high-input-ratio',
        icon: 'input',
        title: 'Very high input-to-output ratio',
        description: `Claude is reading ${ratio.toFixed(0)}x more tokens than it outputs. This often means large codebases being re-scanned. Try using /compact to reduce context size, or use more specific file references in your prompts.`,
        impact: 'medium',
      });
    }
  }

  // 8. Usage spikes
  if (dailyUsage.length > 7) {
    const recent7 = dailyUsage.slice(-7);
    const avg7 = recent7.reduce((s, d) => s + d.totalTokens, 0) / 7;
    const maxDay = recent7.reduce((max, d) => d.totalTokens > max.totalTokens ? d : max, recent7[0]);
    if (maxDay.totalTokens > avg7 * 3 && avg7 > 0) {
      tips.push({
        id: 'usage-spike',
        icon: 'spike',
        title: 'Usage spike detected',
        description: `${maxDay.date} used ${formatTokens(maxDay.totalTokens)} tokens — ${(maxDay.totalTokens / avg7).toFixed(1)}x your 7-day average. Heavy days are normal during complex tasks, but if this was unintentional, review that day's sessions.`,
        impact: 'info',
      });
    }
  }

  return tips;
}

function formatProjectName(name) {
  // Convert encoded project dir names to readable form
  return name.replace(/^-/, '/').replace(/-/g, '/');
}

function formatTokens(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

module.exports = { generateOptimizations };
