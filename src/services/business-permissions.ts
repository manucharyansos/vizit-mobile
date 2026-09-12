export function businessPermissions(role?: string) {
  const canManage = role === 'owner' || role === 'manager';
  return { canManage, canBill: role === 'owner', isStaff: role === 'staff' };
}
