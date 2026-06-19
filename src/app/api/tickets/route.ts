import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Ticket } from "@/lib/models";
import { syncLeadFromTicket } from "@/lib/leads-from-tickets";
import { publishRealtimeEvent } from "@/lib/realtime";
import { requireAuth } from "@/server/auth/guards";

export async function GET(req: NextRequest) {
  let session: any;
  try { session = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "25")));
  const skip = (page - 1) * limit;
  const filter: Record<string, any> = { tenantId: session.user.tenantId };
  const status = searchParams.get("status");
  if (status) filter.status = status;
  const priority = searchParams.get("priority");
  if (priority) filter.priority = priority;
  const assignedTo = searchParams.get("assignedTo");
  if (assignedTo) filter.assignedTo = assignedTo;
  if (searchParams.get("slaBreached") === "true") filter.slaBreached = true;
  const q = searchParams.get("q");
  if (q?.trim()) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } }
    ];
  }
  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Ticket.countDocuments(filter)
  ]);
  return NextResponse.json({ tickets, total, page, limit });
}

export async function POST(req: NextRequest) {
  let session: any;
  try { session = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  await connectToDatabase();
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Ticket title is required." }, { status: 400 });
  const ticket = await Ticket.create({
    tenantId: session.user.tenantId,
    contactId: body.contactId,
    conversationId: body.conversationId,
    title: body.title.trim(),
    description: body.description || "",
    status: body.status || "open",
    priority: body.priority || "medium",
    category: body.category || "",
    assignedTo: body.assignedTo,
    teamId: body.teamId,
    dueAt: body.dueAt,
    tags: body.tags || [],
    customFields: body.customFields || {}
  });
  await syncLeadFromTicket({ tenantId: session.user.tenantId, ticketId: ticket._id.toString() }).catch(() => null);
  await publishRealtimeEvent(session.user.tenantId, "ticket.created", {
    ticket: {
      id: ticket._id.toString(),
      number: ticket.number || 0,
      subject: ticket.subject || ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt?.toISOString?.() || new Date().toISOString(),
    },
    conversation: { id: ticket.conversationId?.toString?.() || "" },
  }).catch(() => undefined);
  return NextResponse.json({ ticket }, { status: 201 });
}
