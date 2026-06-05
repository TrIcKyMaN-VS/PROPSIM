import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log("Removing ADMIN role from all existing users...")
  await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { role: 'USER' }
  })

  console.log("Creating new ADMIN user...")
  const hashedPassword = bcrypt.hashSync("Admin@dev", 10)

  // Use upsert so we don't crash if the email already exists
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@dev44.com" },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      plan: 'LIFETIME'
    },
    create: {
      name: "Admin",
      email: "admin@dev44.com",
      password: hashedPassword,
      role: 'ADMIN',
      plan: 'LIFETIME'
    }
  })

  console.log("Done! Created/Updated Admin:")
  console.log(`Email: ${adminUser.email}`)
  console.log(`Role: ${adminUser.role}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
