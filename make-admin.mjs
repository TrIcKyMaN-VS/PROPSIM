import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.user.updateMany({
    data: {
      role: 'ADMIN',
      plan: 'PRO'
    }
  })
  console.log("All users updated to ADMIN and PRO!")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
