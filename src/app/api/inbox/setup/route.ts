import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureInboxDefaults } from "@/lib/inbox/service";
import { safeJsonError } from "@/lib/api-security";

/**
 * POST /api/inbox/setup
 *
 * Explicit endpoint to initialize inbox defaults (teams, saved replies) for a tenant.
 * Called once during onboarding or first login — not on every inbox request.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureInboxDefaults(session.user.tenantId, session.user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeJsonError(error, "Inbox setup failed.", 500);
  }
}
