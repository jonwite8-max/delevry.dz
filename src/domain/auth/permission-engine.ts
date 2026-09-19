export const permissionActions = {
  shipmentCreate: "shipment:create",
  shipmentRead: "shipment:read",
  shipmentUpdateStatus: "shipment:update-status",
  shipmentCancel: "shipment:cancel",
  financeRead: "finance:read",
  financePaymentCreate: "finance:payment-create",
  financePaymentReverse: "finance:payment-reverse",
  debtSettle: "finance:debt-settle",
  expenseCreate: "finance:expense-create",
  usersManage: "users:manage",
  settingsManage: "settings:manage",
} as const;

export type PermissionAction = (typeof permissionActions)[keyof typeof permissionActions];

const permissions: Record<string, readonly PermissionAction[]> = {
  SUPER_ADMIN: Object.values(permissionActions),
  ADMIN: [
    permissionActions.shipmentCreate, permissionActions.shipmentRead,
    permissionActions.shipmentUpdateStatus, permissionActions.shipmentCancel,
    permissionActions.financeRead, permissionActions.financePaymentCreate,
    permissionActions.financePaymentReverse, permissionActions.debtSettle,
    permissionActions.expenseCreate,
  ],
  STAFF: [permissionActions.shipmentCreate, permissionActions.shipmentRead, permissionActions.shipmentUpdateStatus],
  USER: [permissionActions.shipmentRead],
};

export function can(role: string, action: PermissionAction): boolean {
  return permissions[role]?.includes(action) ?? false;
}
