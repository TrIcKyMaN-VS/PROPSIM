export async function syncNinjaTrader(configObj: any) {
  const { username, password } = configObj

  console.log(`[NinjaTrader Adapter] Authenticating User: ${username}...`)

  await new Promise(r => setTimeout(r, 1800))

  if (username === "fail") {
    throw new Error("NinjaTrader Connection Failed: Invalid Username/Password")
  }

  return {
    tradesAdded: 0,
    message: "NinjaTrader sync completed successfully."
  }
}
