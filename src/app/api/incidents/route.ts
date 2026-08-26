import { addIncident, getAllIncidents, IncidentValidationError } from "@/lib/incidents";
import type { IncidentInput } from "@/lib/types";

export async function GET() {
  return Response.json({ incidents: getAllIncidents() });
}

export async function POST(req: Request) {
  let body: IncidentInput;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const incident = addIncident(body);
    return Response.json(incident, { status: 201 });
  } catch (err) {
    if (err instanceof IncidentValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
