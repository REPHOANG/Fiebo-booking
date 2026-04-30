const norm = (v) => String(v ?? "").toLowerCase().trim();

const ROLE_ALIASES = {
  admin: ["admin"],
  staff: ["staff", "fieldstaff"],
  fieldowner: ["fieldowner"],
  financeadmin: ["financeadmin"],
};

export const getUserRoles = (user) => {
  const raw = user?.roles ?? user?.role ?? "";
  if (Array.isArray(raw)) {
    return raw.map(norm).filter(Boolean);
  }
  return String(raw)
    .split(",")
    .map(norm)
    .filter(Boolean);
};

export const hasRole = (user, role) => {
  const target = norm(role);
  const aliases = ROLE_ALIASES[target] ?? [target];
  const roles = getUserRoles(user);
  return aliases.some((r) => roles.includes(r));
};

export const getHomePathByRole = (user) => {
  const roles = getUserRoles(user);
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("financeadmin")) return "/finance";
  if (roles.includes("staff") || roles.includes("fieldstaff")) return "/staff";
  if (roles.includes("fieldowner")) return "/owner";
  return "/";
};

