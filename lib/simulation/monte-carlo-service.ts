import { MonteCarloInputs, MonteCarloStats } from "./monte-carlo-types"
import { runPropFirmModel } from "./monte-carlo-worker"

export class MonteCarloService {
  private worker: Worker | null = null
  // FIX BUG 10 – limit cache to 1 entry to avoid serving stale results
  private lastCacheKey: string | null = null
  private lastCacheResult: MonteCarloStats | null = null

  run(
    inputs: MonteCarloInputs,
    onProgress?: (progress: number) => void
  ): Promise<MonteCarloStats> {
    const cacheKey = JSON.stringify(inputs)

    // Return cached result only if the inputs are identical to the last run
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
        // FIX BUG 11 – real synchronous fallback: run the model directly on the
        // main thread instead of immediately rejecting.
        console.warn(
          "Web Worker creation failed — falling back to synchronous Monte Carlo simulation.",
          err
        )
        try {
          // Run synchronously; use setTimeout(0) to yield the microtask queue first
          // so the UI can render the loading state before we block.
          setTimeout(() => {
            try {
              const stats = runPropFirmModel(inputs)
              handleResult(stats)
            } catch (e: any) {
              reject(e)
            }
          }, 0)
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
