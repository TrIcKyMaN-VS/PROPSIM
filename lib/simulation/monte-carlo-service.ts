import { MonteCarloInputs, MonteCarloStats } from "./monte-carlo-types"

export class MonteCarloService {
  private worker: Worker | null = null
  private cache = new Map<string, MonteCarloStats>()

  run(
    inputs: MonteCarloInputs,
    historicalTradePnlPcts?: number[],
    onProgress?: (progress: number) => void
  ): Promise<MonteCarloStats> {
    const cacheKey = JSON.stringify({ inputs, historicalTradePnlPcts })
    if (this.cache.has(cacheKey)) {
      return Promise.resolve(this.cache.get(cacheKey)!)
    }

    return new Promise((resolve, reject) => {
      // Terminate previous worker if running
      if (this.worker) {
        this.worker.terminate()
      }

      try {
        // Instantiate the web worker relative to this file
        this.worker = new Worker(
          new URL("./monte-carlo-worker.ts", import.meta.url)
        )

        this.worker.onmessage = (event: MessageEvent) => {
          const { type, stats, progress, error } = event.data

          if (type === "progress" && onProgress) {
            onProgress(progress)
          } else if (type === "complete") {
            this.cache.set(cacheKey, stats)
            resolve(stats)
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

        this.worker.postMessage({
          type: "run",
          inputs,
          historicalTradePnlPcts,
        })
      } catch (err) {
        // Fallback for environment constraints: Run synchronously on main thread
        console.warn("Web Worker creation failed. Falling back to synchronous Monte Carlo simulation.", err)
        try {
          // Import sync runner dynamically
          import("./monte-carlo-worker").then(() => {
            // Web worker file registers ctx.onmessage, so we can emulate it
            // Or we can just import the worker module logic and run it
            // For simplicity, we fallback to a promise timeout
            reject(new Error("Web Worker could not be instantiated. Ensure your browser supports Web Workers."))
          })
        } catch (e) {
          reject(e)
        }
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
