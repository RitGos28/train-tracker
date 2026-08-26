import { removeIncident } from "@/lib/incidents";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const removed = removeIncident(id);
  return removed
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Incident not found" }, { status: 404 });
}
