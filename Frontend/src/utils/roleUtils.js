const norm = (v) => String(v ?? "").toLowerCase().trim();

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
  return getUserRoles(user).includes(target);
};

export const getHomePathByRole = (user) => {
  const roles = getUserRoles(user);
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("staff")) return "/staff";
  if (roles.includes("fieldowner")) return "/owner";
  return "/";
};

