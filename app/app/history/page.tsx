import { HistoryView } from "@/components/app/history-view"

export const metadata = {
  title: "Challenge History | PropSim",
  description: "Review your past prop firm challenges and statistics",
}

export default function HistoryPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <HistoryView />
    </div>
  )
}
