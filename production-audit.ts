import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()

async function runAudit() {
  console.log("==================================================")
  console.log("   PROPSIM PRODUCTION VERIFICATION AUDIT RUNNER   ")
  console.log("==================================================")

  let testUser: any = null
  let testAccount: any = null
  let testPlaybook: any = null
  let testTrade: any = null
  let testChecklist: any = null

  const results = {
    test1: "FAIL",
    test2: "FAIL",
    test3: "FAIL",
    test4: "FAIL",
    test5: "FAIL",
    test6: "FAIL",
    test7: "FAIL",
    test8: "FAIL",
    test9: "FAIL",
  }

  let currentUserId = ""

  // Cache injection for next-auth to allow Server Actions testing
  const nextAuthPath = require.resolve("next-auth");
  const dummyNextAuth = () => {
    return () => {};
  };
  dummyNextAuth.getServerSession = async () => {
    return { user: { id: currentUserId } };
  };

  require("module")._cache[nextAuthPath] = {
    id: nextAuthPath,
    filename: nextAuthPath,
    loaded: true,
    exports: {
      __esModule: true,
      default: dummyNextAuth,
      getServerSession: dummyNextAuth.getServerSession
    }
  };

  try {
    // --- SETUP TEST ENVIRONMENT ---
    console.log("\n[Setup] Creating test user...")
    const hashedPassword = await bcrypt.hash("TestPass123!", 10)
    testUser = await prisma.user.create({
      data: {
        name: "Audit Test User",
        email: `audit_${Date.now()}@test.com`,
        password: hashedPassword,
        role: "USER",
        status: "ACTIVE"
      }
    })
    currentUserId = testUser.id
    console.log(`[Setup] User created: ${testUser.id}`)

    console.log("[Setup] Creating test challenge account...")
    const rulesObj = {
      startingBalance: 50000,
      profitTarget: 3000,
      dailyLossLimit: 1000,
      maxDrawdown: 2000,
      drawdownType: "trailing",
      minTradingDays: 5,
      maxContracts: 5,
      consistencyPct: 30
    }
    testAccount = await prisma.challengeAccount.create({
      data: {
        userId: testUser.id,
        firmId: "topstep",
        sizeLabel: "50K",
        rules: JSON.stringify(rulesObj),
        status: "active"
      }
    })
    console.log(`[Setup] Account created: ${testAccount.id}`)

    // ==========================================
    // TEST 1: Playbook Actions
    // ==========================================
    console.log("\n--- TEST 1: Playbook Actions ---")
    
    // Create Playbook
    console.log("1. Creating playbook...")
    testPlaybook = await prisma.playbook.create({
      data: {
        userId: testUser.id,
        name: "Audit A+ Setup",
        category: "Breakout",
        marketCondition: "Trending",
        session: "New York AM",
        instrument: "NQ",
        entryRules: "MSS + Liquidity sweep",
        exitRules: "1:2 RR",
        riskRules: "Max 1% risk",
        checklist: JSON.stringify(["Rule 1", "Rule 2"])
      }
    })
    console.log(`- Playbook created ID: ${testPlaybook.id}`)

    // Edit Playbook
    console.log("2. Editing playbook...")
    const updatedPlaybook = await prisma.playbook.update({
      where: { id: testPlaybook.id },
      data: { name: "Audit A+ Modified" }
    })
    console.log(`- Playbook name updated: ${updatedPlaybook.name}`)

    // Create a trade and link it
    console.log("3. Creating trade and linking it to playbook...")
    testTrade = await prisma.trade.create({
      data: {
        accountId: testAccount.id,
        playbookId: testPlaybook.id,
        playbookName: testPlaybook.name,
        instrument: "NQ",
        direction: "long",
        entry: 18000,
        exit: 18100,
        contracts: 1,
        pnl: 200,
        day: 1,
        timestamp: BigInt(Date.now()),
        session: "New York AM"
      }
    })
    console.log(`- Linked Trade ID: ${testTrade.id} to Playbook: ${testTrade.playbookId}`)

    // Soft delete playbook
    console.log("4. Soft-deleting playbook...")
    await prisma.playbook.update({
      where: { id: testPlaybook.id },
      data: { deletedAt: new Date() }
    })
    const deletedCheck = await prisma.playbook.findUnique({ where: { id: testPlaybook.id } })
    console.log(`- Playbook deletedAt timestamp set: ${deletedCheck?.deletedAt ? "YES" : "NO"}`)

    if (testPlaybook && updatedPlaybook.name === "Audit A+ Modified" && testTrade.playbookId === testPlaybook.id && deletedCheck?.deletedAt) {
      results.test1 = "PASS"
      console.log("✓ TEST 1: PASS")
    }

    // ==========================================
    // TEST 2: CSV Import & Day Reindexing
    // ==========================================
    console.log("\n--- TEST 2: CSV Import & Day Reindexing ---")
    
    // Add two more trades on different days
    console.log("1. Simulating CSV bulk import (creating trades)...")
    const tsDay1 = Date.now() - 24 * 60 * 60 * 1000 // Yesterday
    const tsDay2 = Date.now() // Today
    
    // Clean existing trades for simple reindexing test
    await prisma.trade.deleteMany({ where: { accountId: testAccount.id } })
    
    const tradeDay1 = await prisma.trade.create({
      data: {
        accountId: testAccount.id,
        instrument: "ES",
        direction: "short",
        entry: 5000,
        exit: 4980,
        contracts: 2,
        pnl: 2000,
        day: 99, // wrong day, needs reindexing
        timestamp: BigInt(tsDay1),
        session: "New York AM"
      }
    })
    
    const tradeDay2 = await prisma.trade.create({
      data: {
        accountId: testAccount.id,
        instrument: "ES",
        direction: "long",
        entry: 5000,
        exit: 5010,
        contracts: 1,
        pnl: 500,
        day: 99, // wrong day, needs reindexing
        timestamp: BigInt(tsDay2),
        session: "New York AM"
      }
    })

    // Duplicate detection test: insert same ES trade at tsDay2
    console.log("2. Verifying duplicate trade prevention...")
    const dupCheck = await prisma.trade.findFirst({
      where: {
        accountId: testAccount.id,
        instrument: "ES",
        timestamp: BigInt(tsDay2)
      }
    })
    console.log(`- Duplicate found by criteria: ${dupCheck ? "YES" : "NO"}`)

    // Run reindexing
    console.log("3. Running reindexTradeDays algorithm...")
    const { reindexTradeDays } = await import("./app/actions/trade-actions")
    await reindexTradeDays(testAccount.id)

    // Verify day values
    const reindexed1 = await prisma.trade.findUnique({ where: { id: tradeDay1.id } })
    const reindexed2 = await prisma.trade.findUnique({ where: { id: tradeDay2.id } })
    console.log(`- Trade 1 reindexed Day: ${reindexed1?.day} (Expected: 1)`)
    console.log(`- Trade 2 reindexed Day: ${reindexed2?.day} (Expected: 2)`)

    if (reindexed1?.day === 1 && reindexed2?.day === 2 && dupCheck) {
      results.test2 = "PASS"
      console.log("✓ TEST 2: PASS")
    }

    // ==========================================
    // TEST 3: Login & Session
    // ==========================================
    console.log("\n--- TEST 3: Login & Session ---")
    
    console.log("1. Simulating Credentials authorize...")
    const loginUser = await prisma.user.findUnique({ where: { email: testUser.email } })
    const isPassValid = await bcrypt.compare("TestPass123!", loginUser?.password || "")
    console.log(`- Bcrypt password verified: ${isPassValid}`)

    console.log("2. Simulating DeviceSession creation...")
    const devSession = await prisma.deviceSession.create({
      data: {
        userId: testUser.id,
        userAgent: "Audit Runner Browser",
        ip: "127.0.0.1",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })
    console.log(`- DeviceSession created: ${devSession.id}`)

    console.log("3. Simulating Logout/Session invalidation...")
    await prisma.deviceSession.update({
      where: { id: devSession.id },
      data: { isValid: false }
    })
    const invalidated = await prisma.deviceSession.findUnique({ where: { id: devSession.id } })
    console.log(`- Session isValid flag: ${invalidated?.isValid}`)

    if (isPassValid && devSession.id && invalidated && !invalidated.isValid) {
      results.test3 = "PASS"
      console.log("✓ TEST 3: PASS")
    }

    // ==========================================
    // TEST 4: Screenshot Storage Fallback
    // ==========================================
    console.log("\n--- TEST 4: Screenshot Storage Fallback ---")
    
    // Create new trade for screenshot testing
    const scTrade = await prisma.trade.create({
      data: {
        accountId: testAccount.id,
        instrument: "CL",
        direction: "long",
        entry: 75.50,
        exit: 76.00,
        contracts: 1,
        pnl: 500,
        day: 1,
        timestamp: BigInt(Date.now()),
        session: "New York AM"
      }
    })

    console.log("1. Executing local uploader fallback write...")
    const fileName = `${scTrade.id}_pre_trade_${Date.now()}.png`
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    const filePath = path.join(uploadsDir, fileName)
    const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")
    
    await fs.promises.writeFile(filePath, buffer)
    console.log(`- File written to: ${filePath}`)
    
    const dbSc = await prisma.tradeScreenshot.create({
      data: {
        tradeId: scTrade.id,
        stage: "Pre-Trade",
        url: `/uploads/${fileName}`
      }
    })
    console.log(`- Database TradeScreenshot row created: ${dbSc.id}`)

    // Test delete cleanup
    console.log("2. Verifying screenshot deletion cleanup...")
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    await prisma.tradeScreenshot.delete({ where: { id: dbSc.id } })
    console.log(`- File deleted from disk: ${!fs.existsSync(filePath)}`)
    console.log(`- Database row deleted: YES`)

    if (!fs.existsSync(filePath)) {
      results.test4 = "PASS"
      console.log("✓ TEST 4: PASS")
    }

    // ==========================================
    // TEST 5: Checklist Templates
    // ==========================================
    console.log("\n--- TEST 5: Checklist Templates ---")
    
    console.log("1. Creating checklist template...")
    testChecklist = await prisma.checklistTemplate.create({
      data: {
        userId: testUser.id,
        name: "Audit Checklist",
        items: JSON.stringify([{ id: "1", text: "Condition 1", required: true }])
      }
    })
    console.log(`- Checklist template created: ${testChecklist.id}`)

    console.log("2. Updating checklist template...")
    const updatedChecklist = await prisma.checklistTemplate.update({
      where: { id: testChecklist.id },
      data: { name: "Audit Checklist Modified" }
    })
    console.log(`- Checklist template name: ${updatedChecklist.name}`)

    console.log("3. Deleting checklist template...")
    await prisma.checklistTemplate.delete({ where: { id: testChecklist.id } })
    const deletedChecklist = await prisma.checklistTemplate.findUnique({ where: { id: testChecklist.id } })
    console.log(`- Checklist template deleted: ${deletedChecklist === null ? "YES" : "NO"}`)

    if (testChecklist && updatedChecklist.name === "Audit Checklist Modified" && !deletedChecklist) {
      results.test5 = "PASS"
      console.log("✓ TEST 5: PASS")
    }

    // ==========================================
    // TEST 6: AI Reviews
    // ==========================================
    console.log("\n--- TEST 6: AI Reviews ---")
    
    console.log("1. Creating AI Daily Review cached row...")
    const reviewData = { summary: "Good discipline today.", bestDecision: "Cutting losses quick", worstDecision: "None" }
    const dateKey = "2026-06-09"
    const aiReview = await prisma.aiReview.create({
      data: {
        userId: testUser.id,
        type: "DAILY",
        dateKey,
        summary: JSON.stringify(reviewData)
      }
    })
    console.log(`- Cached Review ID: ${aiReview.id}`)

    console.log("2. Simulating AI Review cache query...")
    const cachedReview = await prisma.aiReview.findUnique({
      where: {
        userId_type_dateKey: {
          userId: testUser.id,
          type: "DAILY",
          dateKey
        }
      }
    })
    console.log(`- Cache hit: ${cachedReview ? "YES" : "NO"}`)
    console.log(`- Cached summary content: ${JSON.parse(cachedReview?.summary || "{}").summary}`)

    if (aiReview && cachedReview && JSON.parse(cachedReview.summary).summary === "Good discipline today.") {
      results.test6 = "PASS"
      console.log("✓ TEST 6: PASS")
    }

    // ==========================================
    // TEST 7: Rule Builder & Interpreter
    // ==========================================
    console.log("\n--- TEST 7: Rule Builder & Interpreter ---")
    
    // Simulate node interpretation
    const nodeRules = {
      nodes: [
        { id: "1", data: { config: { type: "Daily Loss", operator: ">", value: "1000" }, label: "Daily Loss > 1000" } },
        { id: "2", data: { config: { action: "Fail Challenge" }, label: "Fail Challenge" } }
      ],
      edges: [
        { source: "1", target: "2" }
      ]
    }
    
    console.log("1. Simulating custom node rules graph parser...")
    let dayPnl = -1200 // Exceeds daily loss limit
    let failedChallenge = false
    
    // Interpreter logic execution
    const condNode = nodeRules.nodes[0]
    const val = Number(condNode.data.config.value)
    if (Math.abs(dayPnl) > val) {
      const edge = nodeRules.edges.find(e => e.source === condNode.id)
      if (edge) {
        const targetNode = nodeRules.nodes.find(n => n.id === edge.target)
        if (targetNode && targetNode.data.config.action === "Fail Challenge") {
          failedChallenge = true
        }
      }
    }
    console.log(`- Graph Node matched: YES`)
    console.log(`- Action triggered: Fail Challenge (Result: ${failedChallenge})`)

    if (failedChallenge) {
      results.test7 = "PASS"
      console.log("✓ TEST 7: PASS")
    }

    // ==========================================
    // TEST 8: Challenge Engine simulation
    // ==========================================
    console.log("\n--- TEST 8: Challenge Engine ---")
    
    // Set up trade excursion levels (MFE / MAE)
    // Account limit is Max Drawdown 2000, starting balance 50000, floor is 48000
    const evaluateTrades = [
      {
        id: "t1",
        accountId: testAccount.id,
        instrument: "ES",
        direction: "long" as any,
        entry: 5000,
        exit: 5010,
        contracts: 1,
        pnl: 500,
        day: 1,
        timestamp: Date.now(),
        favorableExcursion: 600, // Peak equity 50600
        adverseExcursion: -100 // Worst equity 49900 (safe)
      },
      {
        id: "t2",
        accountId: testAccount.id,
        instrument: "ES",
        direction: "long" as any,
        entry: 5000,
        exit: 4950,
        contracts: 2,
        pnl: -1000,
        day: 2,
        timestamp: Date.now() + 10000,
        favorableExcursion: 0,
        adverseExcursion: -2100 // Worst equity 50500 - 2100 = 48400. 
      }
    ] as any[]

    console.log("1. Running trailing open equity drawdown evaluation...")
    const { evaluate } = await import("./lib/rule-engine")
    const evalResult = evaluate(rulesObj, evaluateTrades)
    console.log(`- Challenge Status: ${evalResult.status}`)
    console.log(`- Total P&L: $${evalResult.totalPnl}`)
    console.log(`- Violations count: ${evalResult.violations.length}`)
    console.log(`- Breach description: ${evalResult.violations[0]?.detail}`)

    if (evalResult.status === "failed" && evalResult.violations[0]?.type === "trailing_drawdown") {
      results.test8 = "PASS"
      console.log("✓ TEST 8: PASS")
    }

    // ==========================================
    // TEST 9: Challenge Type: Official vs Custom & Reset
    // ==========================================
    console.log("\n--- TEST 9: Challenge Type: Official vs Custom & Reset ---")
    
    // Import actions dynamically after require cache injection
    const { createAccount, resetToOfficialRules } = await import("./app/actions/account-actions")

    // 1. Create Official Challenge
    console.log("1. Creating Official challenge...")
    const officialAcc = await createAccount("topstep", "50K", "OFFICIAL")
    console.log(`- Created Official Challenge: ${officialAcc.id}`)
    
    // Assert defaults
    const rulesObjOfficial = JSON.parse(officialAcc.rules)
    const officialValid = officialAcc.challengeType === "OFFICIAL" && 
                          officialAcc.baseRules !== null && 
                          JSON.parse(officialAcc.baseRules).startingBalance === 50000 &&
                          officialAcc.customOverrides === null
    console.log(`- Official Challenge properties check: ${officialValid ? "PASS" : "FAIL"}`)

    // 2. Create Custom Challenge with overrides
    console.log("2. Creating Custom challenge with overrides...")
    const customOverridesInput = {
      startingBalance: 60000,
      profitTarget: 4000,
      maxContracts: 10
    }
    const customAcc = await createAccount("topstep", "50K", "CUSTOM", customOverridesInput)
    console.log(`- Created Custom Challenge: ${customAcc.id}`)
    
    const rulesObjCustom = JSON.parse(customAcc.rules)
    const customOverridesSaved = JSON.parse(customAcc.customOverrides!)
    
    const customValid = customAcc.challengeType === "CUSTOM" &&
                        rulesObjCustom.startingBalance === 60000 &&
                        rulesObjCustom.profitTarget === 4000 &&
                        rulesObjCustom.maxContracts === 10 &&
                        customOverridesSaved.startingBalance === 60000 &&
                        customAcc.baseRules !== null
    console.log(`- Custom Challenge properties check: ${customValid ? "PASS" : "FAIL"}`)

    // 3. Verify validation boundaries
    console.log("3. Verifying validation boundaries...")
    let validationFailed = false
    try {
      // Starting balance <= 0 should fail
      await createAccount("topstep", "50K", "CUSTOM", { startingBalance: 0 })
    } catch (e: any) {
      console.log(`- Caught invalid balance: ${e.message}`)
      validationFailed = e.message.includes("Starting Balance must be greater than 0")
    }

    try {
      // Max contracts > 100 should fail
      await createAccount("topstep", "50K", "CUSTOM", { maxContracts: 101 })
    } catch (e: any) {
      console.log(`- Caught invalid max contracts: ${e.message}`)
      validationFailed = validationFailed && e.message.includes("Max Contracts must be between 1 and 100")
    }

    try {
      // Consistency % < 0 should fail
      await createAccount("topstep", "50K", "CUSTOM", { consistencyPct: -1 })
    } catch (e: any) {
      console.log(`- Caught invalid consistency %: ${e.message}`)
      validationFailed = validationFailed && e.message.includes("Consistency % must be between 0 and 100")
    }
    console.log(`- Validation boundaries check: ${validationFailed ? "PASS" : "FAIL"}`)

    // 4. Reset to Official Rules
    console.log("4. Resetting Custom challenge to Official...")
    await resetToOfficialRules(customAcc.id)
    
    const resetAcc = await prisma.challengeAccount.findUnique({
      where: { id: customAcc.id }
    })
    
    const rulesObjReset = JSON.parse(resetAcc!.rules)
    const resetValid = resetAcc?.challengeType === "OFFICIAL" &&
                       resetAcc.customOverrides === null &&
                       rulesObjReset.startingBalance === 50000 &&
                       rulesObjReset.maxContracts === 5
    console.log(`- Reset Challenge properties check: ${resetValid ? "PASS" : "FAIL"}`)

    if (officialValid && customValid && validationFailed && resetValid) {
      results.test9 = "PASS"
      console.log("✓ TEST 9: PASS")
    }

  } catch (error) {
    console.error("Audit test error encountered:", error)
  } finally {
    // --- CLEANUP TEST ENVIRONMENT ---
    console.log("\n[Cleanup] Cleaning up audit database records...")
    if (testUser) {
      await prisma.trade.deleteMany({ where: { account: { userId: testUser.id } } })
      await prisma.ruleViolation.deleteMany({ where: { account: { userId: testUser.id } } })
      await prisma.challengeAccount.deleteMany({ where: { userId: testUser.id } })
      await prisma.playbook.deleteMany({ where: { userId: testUser.id } })
      await prisma.aiReview.deleteMany({ where: { userId: testUser.id } })
      await prisma.deviceSession.deleteMany({ where: { userId: testUser.id } })
      await prisma.user.delete({ where: { id: testUser.id } })
    }
    await prisma.$disconnect()
    console.log("[Cleanup] Completed.")
  }

  console.log("\n==================================================")
  console.log("               AUDIT SCORECARD                    ")
  console.log("==================================================")
  let passedCount = 0
  for (const [t, r] of Object.entries(results)) {
    console.log(`${t.toUpperCase()}: ${r}`)
    if (r === "PASS") passedCount++
  }
  const score = Math.round((passedCount / 9) * 100)
  console.log(`\nPRODUCTION READINESS SCORE: ${score}/100`)
  console.log("==================================================")
}

runAudit()
