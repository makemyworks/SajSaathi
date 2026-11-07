/** Central-API areas reachable through the admin console's proxy. */
const ALLOW = [/^admin\/[a-z0-9/_-]*$/i, /^bookings(\/[a-f0-9]{24}(\/(action|reschedule))?)?$/, /^auth\/(me|password|admin-profile)$/, /^categories$/, /^files\/[a-f0-9]{24}$/];
export function allowed(path: string): boolean {
  if (path.includes("..") || path.includes("//")) return false;
  return ALLOW.some((r) => r.test(path));
}
