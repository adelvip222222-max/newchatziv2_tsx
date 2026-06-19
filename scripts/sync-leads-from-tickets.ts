import { syncLeadsFromTickets } from "../src/lib/leads-from-tickets";

async function main() {
  const tenantId = process.argv[2] || process.env.TENANT_ID || "";
  if (!tenantId) throw new Error("Usage: TENANT_ID=<tenantId> npm run leads:sync or ts-node scripts/sync-leads-from-tickets.ts <tenantId>");
  const result = await syncLeadsFromTickets({ tenantId, limit: Number(process.env.LEADS_SYNC_LIMIT || 5000) });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
