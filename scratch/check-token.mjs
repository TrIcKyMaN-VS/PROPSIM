import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const token = "404c31b3f7f824414fde4b1195fcbfd18ae8ce9e060875f529caf15ae7fdc57e"
  const apiToken = await prisma.apiToken.findUnique({
    where: { token }
  })
  console.log("API Token record:", apiToken)
}

main().catch(console.error).finally(() => prisma.$disconnect())
