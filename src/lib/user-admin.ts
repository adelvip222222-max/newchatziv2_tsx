import { Tenant, User } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";

export const TENANT_USER_LIMITS = {
  admin: 2,
  manager: 5,
  agent: 10,
  viewer: 25
} as const;

export async function getAdminUsersData(tenantId: string) {
  await connectToDatabase();
  const [tenant, users] = await Promise.all([
    Tenant.findById(tenantId).lean(),
    User.find({ tenantId }).sort({ role: 1, createdAt: 1 }).lean()
  ]);
  const admins = users.filter((user) => user.role === "admin").length;
  const managers = users.filter((user) => user.role === "manager").length;
  const agents = users.filter((user) => user.role === "agent").length;
  const viewers = users.filter((user) => user.role === "viewer").length;

  return {
    ownerId: tenant?.ownerId?.toString() || "",
    limits: {
      admin: TENANT_USER_LIMITS.admin,
      manager: TENANT_USER_LIMITS.manager,
      agent: TENANT_USER_LIMITS.agent,
      viewer: TENANT_USER_LIMITS.viewer
    },
    usage: { admin: admins, manager: managers, agent: agents, viewer: viewers },
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      ownerId: user.ownerId?.toString() || tenant?.ownerId?.toString() || "",
      isActive: user.isActive !== false,
      createdAt: user.createdAt?.toISOString() || ""
    }))
  };
}
