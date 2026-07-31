import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    console.error("Please add them to your .env file and run this script again.")
    process.exit(1)
  }

  console.log("🔍 Finding local screenshots in database...")
  const localScreenshots = await prisma.tradeScreenshot.findMany({
    where: {
      url: {
        startsWith: '/uploads/'
      }
    }
  })

  console.log(`Found ${localScreenshots.length} screenshots to migrate.`)

  for (const sc of localScreenshots) {
    const fileName = path.basename(sc.url)
    const localPath = path.join(__dirname, 'public', 'uploads', fileName)

    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  Skipping ${fileName}: file not found on local disk.`)
      continue
    }

    console.log(`\n📤 Uploading ${fileName}...`)
    const buffer = fs.readFileSync(localPath)
    
    // Determine mime type
    const ext = path.extname(fileName).toLowerCase()
    let mimeType = "image/png"
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg"
    if (ext === ".webp") mimeType = "image/webp"

    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase.storage
        .from('screenshots')
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true
        })

      if (error) {
        console.error(`❌ Failed to upload ${fileName}:`, error.message)
        continue
      }

      const finalUrl = `${supabaseUrl}/storage/v1/object/public/screenshots/${fileName}`
      
      console.log(`🔄 Updating database with new URL: ${finalUrl}`)
      await prisma.tradeScreenshot.update({
        where: { id: sc.id },
        data: { url: finalUrl }
      })

      console.log(`✅ Success for ${fileName}`)
      
      // Optional: Delete the local file after success so we don't upload it again if ran twice
      // fs.unlinkSync(localPath)

    } catch (error) {
      console.error(`❌ Error migrating ${fileName}:`, error)
    }
  }

  console.log("\n🎉 Migration complete!")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
