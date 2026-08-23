const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('@@index([accountId, timestamp])')) {
  schema = schema.replace(
    'model Trade {',
    `model Trade {\n  @@index([accountId, timestamp])\n  @@index([timestamp])`
  );
  
  schema = schema.replace(
    'model ChallengeAccount {',
    `model ChallengeAccount {\n  @@index([userId, status])`
  );
  
  schema = schema.replace(
    'model DailyJournal {',
    `model DailyJournal {\n  @@index([userId, date])`
  );
  
  schema = schema.replace(
    'model WeeklyReview {',
    `model WeeklyReview {\n  @@index([userId, weekOf])`
  );

  fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
  console.log('Indexes added to schema.');
}
