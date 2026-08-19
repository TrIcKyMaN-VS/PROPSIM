const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.trade.count();
  console.log('Total trades:', count);
  await prisma.$disconnect();
}
check();
