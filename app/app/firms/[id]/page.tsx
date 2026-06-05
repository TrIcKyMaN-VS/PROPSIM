import { notFound } from "next/navigation"
import { FIRMS, getFirm } from "@/lib/firms"
import { FirmDetail } from "@/components/app/firm-detail"

export function generateStaticParams() {
  return FIRMS.map((f) => ({ id: f.id }))
}

export default async function FirmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const firm = getFirm(id)
  if (!firm) notFound()
  return <FirmDetail firm={firm} />
}
