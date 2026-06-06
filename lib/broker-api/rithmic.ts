export async function syncRithmic(configObj: any) {
  const { username, password, server } = configObj

  console.log(`[Rithmic Adapter] Connecting to Server: ${server} for User: ${username}...`)

  await new Promise(r => setTimeout(r, 2000))

  if (username === "fail") {
    throw new Error("Rithmic Protocol Error: Authentication Denied")
  }

  return {
    tradesAdded: 0,
    message: "Rithmic sync completed successfully."
  }
}
