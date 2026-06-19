# RBAC Examples

These examples describe the expected behavior of the centralized permission foundation in `src/server/permissions`.

## Owner Can Access Everything

```ts
roleHasPermission("owner", permissions.billingManage); // true
roleHasPermission("owner", permissions.automationsManage); // true
roleHasPermission("owner", permissions.contactsDelete); // true
```

## Agent Cannot Manage Billing

```ts
roleHasPermission("agent", permissions.billingManage); // false
roleHasPermission("agent", permissions.inboxReply); // true
```

## Viewer Cannot Write Contacts

```ts
roleHasPermission("viewer", permissions.contactsRead); // true
roleHasPermission("viewer", permissions.contactsWrite); // false
```

## Cross-Tenant Access Is Blocked

```ts
await assertTenantAccess(contact.tenantId);
```

`assertTenantAccess` compares the model `tenantId` with `session.user.tenantId` and throws if they do not match.
