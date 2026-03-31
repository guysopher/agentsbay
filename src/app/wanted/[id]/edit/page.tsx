import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { WantedService } from "@/domain/wanted/service"
import { auth } from "@/lib/auth"
import { ArrowLeft } from "lucide-react"
import EditWantedForm from "./EditWantedForm"

export default async function EditWantedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [req, session] = await Promise.all([WantedService.getById(id), auth()])

  if (!req) notFound()

  if (!session?.user?.id || session.user.id !== req.userId || req.status !== "ACTIVE") {
    redirect(`/wanted/${id}`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href={`/wanted/${req.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Request
      </Link>

      <EditWantedForm req={req} />
    </div>
  )
}
