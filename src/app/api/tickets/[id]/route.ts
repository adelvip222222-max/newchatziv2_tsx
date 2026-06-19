import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Ticket } from "@/lib/models";
import { syncLeadFromTicket } from "@/lib/leads-from-tickets";
import { publishRealtimeEvent } from "@/lib/realtime";
import { requireAuth } from "@/server/auth/guards";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let session: any;
  try { session = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  await connectToDatabase();
  const ticket = await Ticket.findOne({ _id: id, tenantId: session.user.tenantId }).lean();
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session: any;
  try { session = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  await connectToDatabase();
  const body = await req.json();
  const allowedFields = [
    "title",
    "subject",
    "description",
    "status",
    "priority",
    "category",
    "assignedTo",
    "teamId",
    "dueAt",
    "tags",
    "customFields",
    "slaBreached",
    "triggerReason",
    "aiSummary",
    "metadata"
  ];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) { if (key in body) updates[key] = body[key]; }
  if ("subject" in body && !("title" in body)) updates.title = body.subject;
  if (body.status === "resolved" || body.status === "closed") updates.resolvedAt = new Date();
  const ticket = await Ticket.findOneAndUpdate({ _id: id, tenantId: session.user.tenantId }, { $set: updates }, { new: true });
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  await syncLeadFromTicket({ tenantId: session.user.tenantId, ticketId: ticket._id.toString() }).catch(() => null);
  await publishRealtimeEvent(session.user.tenantId, "ticket.updated", {
    ticket: {
      id: ticket._id.toString(),
      number: ticket.number || 0,
      subject: ticket.subject || ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      updatedAt: ticket.updatedAt?.toISOString?.() || new Date().toISOString(),
    },
    conversation: { id: ticket.conversationId?.toString?.() || "" },
  }).catch(() => undefined);
  return NextResponse.json({ ticket });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let session: any;
  try { session = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  await connectToDatabase();
  const ticket = await Ticket.findOneAndDelete({ _id: id, tenantId: session.user.tenantId });
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  await publishRealtimeEvent(session.user.tenantId, "ticket.deleted", {
    ticket: { id: ticket._id.toString(), number: ticket.number || 0, subject: ticket.subject || ticket.title },
    conversation: { id: ticket.conversationId?.toString?.() || "" },
  }).catch(() => undefined);
  return NextResponse.json({ success: true });
}
