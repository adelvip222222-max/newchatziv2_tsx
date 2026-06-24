import { NextResponse } from "next/server";
import { z } from "zod";
import { assertObjectIdLike, checkRateLimit, getClientIp, parseJsonBody, safeJsonError } from "@/lib/api-security";
import { connectToDatabase } from "@/lib/mongodb";
import { Bot, Ticket } from "@/lib/models";

const bookingSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email().max(180),
  company: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(2000).optional().default("")
});

export async function POST(req: Request) {
  try {
    await checkRateLimit(`book:${getClientIp(req)}`, { limit: 8, windowMs: 60_000 });
    const body = await parseJsonBody(req, bookingSchema, { maxBytes: 8 * 1024 });
    const tenantId =
      process.env.BOOKING_TENANT_ID ||
      process.env.DEFAULT_TENANT_ID ||
      "";

    assertObjectIdLike(tenantId, "BOOKING_TENANT_ID");

    await connectToDatabase();

    const bot = await Bot.findOne({ tenantId, isActive: true }).select("_id name").lean();
    const counter = await Ticket.countDocuments({ tenantId });
    const title = `طلب حجز: ${body.firstName} ${body.lastName || ""}`.trim();
    const newTicket = await Ticket.create({
      tenantId,
      ...(bot?._id && { botId: bot._id }),
      number: counter + 1,
      title,
      subject: title,
      description: [
        `الاسم: ${body.firstName} ${body.lastName || ""}`.trim(),
        `البريد: ${body.email.toLowerCase()}`,
        body.company ? `الشركة: ${body.company}` : "",
        body.notes ? `ملاحظات: ${body.notes}` : "",
      ].filter(Boolean).join("\n"),
      priority: "medium",
      category: "booking_request",
      requesterExternalId: body.email.toLowerCase(),
      channel: "website",
      source: "ai",
      triggerReason: "website_booking_form",
      aiSummary: body.notes || title,
      metadata: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email.toLowerCase(),
        company: body.company,
        notes: body.notes,
        source: "Website Booking",
      },
      status: "open",
    });

    return NextResponse.json({ success: true, ticketId: newTicket._id });
  } catch (error) {
    console.error("Error creating booking ticket:", error);
    return safeJsonError(error, "Unable to create booking ticket.", 400);
  }
}
