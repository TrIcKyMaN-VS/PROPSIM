"use client"

import { motion } from "framer-motion"

const stats = [
  { value: "184,920", label: "Challenges Simulated" },
  { value: "9.7%", label: "Avg. Live Pass Rate" },
  { value: "32,400", label: "Traders Evaluated" },
  { value: "2.1M", label: "Trades Logged" },
]

export function Stats() {
  return (
    <section className="border-b border-border/60 bg-card/30">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-6 py-10 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="px-4 py-2 text-center"
          >
            <p className="text-3xl font-bold tracking-tight tabular-nums md:text-4xl">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
