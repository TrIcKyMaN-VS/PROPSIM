import { runDatabaseMaintenance } from "../lib/cleanup-service"

async function main() {
  console.log("Running database maintenance...")
  try {
    const result = await runDatabaseMaintenance()
    console.log("Cleanup complete:", JSON.stringify(result, null, 2))
  } catch (error) {
    console.error("Error running maintenance:", error)
    process.exit(1)
  }
}

main().then(() => process.exit(0))
