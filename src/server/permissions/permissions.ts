export const permissions = {
  contactsRead: "contacts.read",
  contactsWrite: "contacts.write",
  contactsDelete: "contacts.delete",

  companiesRead: "companies.read",
  companiesWrite: "companies.write",
  companiesDelete: "companies.delete",

  inboxRead: "inbox.read",
  inboxReply: "inbox.reply",
  inboxAssign: "inbox.assign",
  inboxManage: "inbox.manage",

  teamsRead: "teams.read",
  teamsWrite: "teams.write",

  aiRead: "ai.read",
  aiManage: "ai.manage",

  knowledgeRead: "knowledge.read",
  knowledgeManage: "knowledge.manage",

  automationsRead: "automations.read",
  automationsManage: "automations.manage",

  reportsRead: "reports.read",

  billingRead: "billing.read",
  billingManage: "billing.manage",

  settingsRead: "settings.read",
  settingsManage: "settings.manage"
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];
