const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const screenshots = await prisma.tradeScreenshot.findMany();
  let base64Count = 0;
  for (const s of screenshots) {
    if (s.url && s.url.startsWith('data:image')) {
      base64Count++;
      console.log('TradeScreenshot contains base64! ID:', s.id, 'Length:', s.url.length);
    }
  }
  
  const journals = await prisma.dailyJournal.findMany();
  let journalBase64Count = 0;
  for (const j of journals) {
    if (j.preMarketScreenshots) {
      for (const url of j.preMarketScreenshots) {
        if (url.startsWith('data:image')) {
          journalBase64Count++;
          console.log('DailyJournal PM contains base64! ID:', j.id, 'Length:', url.length);
        }
      }
    }
    if (j.postSessionScreenshots) {
      for (const url of j.postSessionScreenshots) {
        if (url.startsWith('data:image')) {
          journalBase64Count++;
          console.log('DailyJournal PS contains base64! ID:', j.id, 'Length:', url.length);
        }
      }
    }
  }

  console.log('Total TradeScreenshot base64:', base64Count);
  console.log('Total DailyJournal base64:', journalBase64Count);
  await prisma.$disconnect();
}
check();
