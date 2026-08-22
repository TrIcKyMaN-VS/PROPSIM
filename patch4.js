const fs = require('fs');
let content = fs.readFileSync('app/actions/weekly-review-ai-actions.ts', 'utf8');

content = content.replace(`if (usage) {
      await trackAiUsage(session.user.id, usage.totalTokens, providerInfo.provider)
    }`, `if (usage?.totalTokens) {
      await trackAiUsage(session.user.id, usage.totalTokens, providerInfo.provider)
    }`);

fs.writeFileSync('app/actions/weekly-review-ai-actions.ts', content, 'utf8');
