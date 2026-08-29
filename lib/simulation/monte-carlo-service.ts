import { MonteCarloInputs, MonteCarloStats } from "./monte-carlo-types"
import { runPropFirmModel } from "./monte-carlo-worker"

export class MonteCarloService {
  private worker: Worker | null = null
  // Single-entry cache — avoids infinite growth and stale long-lived results
  private lastCacheKey: string | null = null
  private lastCacheResult: MonteCarloStats | null = null

  run(
    inputs: MonteCarloInputs,
    onProgress?: (progress: number) => void
  ): Promise<MonteCarloStats> {
    const cacheKey = JSON.stringify(inputs)

    if (this.lastCacheKey === cacheKey && this.lastCacheResult) {
      return Promise.resolve(this.lastCacheResult)
    }

    return new Promise((resolve, reject) => {
      // Terminate any previous in-flight worker
      if (this.worker) {
        this.worker.terminate()
        this.worker = null
      }

      const handleResult = (stats: MonteCarloStats) => {
        this.lastCacheKey = cacheKey
        this.lastCacheResult = stats
        resolve(stats)
      }

      try {
        this.worker = new Worker(
          new URL("./monte-carlo-worker.ts", import.meta.url)
        )

        this.worker.onmessage = (event: MessageEvent) => {
          const { type, stats, progress, error } = event.data

          if (type === "progress" && onProgress) {
            onProgress(progress)
          } else if (type === "complete") {
            handleResult(stats)
            this.worker?.terminate()
            this.worker = null
          } else if (type === "error") {
            reject(new Error(error))
            this.worker?.terminate()
            this.worker = null
          }
        }

        this.worker.onerror = (err) => {
          reject(err)
          this.worker?.terminate()
          this.worker = null
        }

        this.worker.postMessage({ type: "run", inputs })

      } catch (err) {
        // Real synchronous fallback — runs the pure model on the main thread.
        // runPropFirmModel no longer calls any Worker globals so this is safe.
        console.warn(
          "Web Worker creation failed — falling back to synchronous Monte Carlo simulation.",
          err
        )
        setTimeout(() => {
          try {
            // Pass onProgress so callers still get progress events if they want
            const stats = runPropFirmModel(inputs, onProgress)
            handleResult(stats)
          } catch (e: any) {
            reject(e)
          }
        }, 0)
      }
    })
  }

  cancel() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}
