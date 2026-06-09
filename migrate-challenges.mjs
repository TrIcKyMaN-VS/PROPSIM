import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting challenge accounts migration...")
  const accounts = await prisma.challengeAccount.findMany()
  console.log(`Found ${accounts.length} challenge accounts to inspect.`)

  let updatedCount = 0
  for (const acc of accounts) {
    // If baseRules is not set, we default it to rules and set type to OFFICIAL
    if (!acc.baseRules) {
      await prisma.challengeAccount.update({
        where: { id: acc.id },
        data: {
          challengeType: "OFFICIAL",
          baseRules: acc.rules,
          customOverrides: null
        }
      })
      updatedCount++
    }
  }

  console.log(`Migration completed. Updated ${updatedCount} accounts.`)
}

main()
  .catch((err) => {
    console.error("Migration error:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
