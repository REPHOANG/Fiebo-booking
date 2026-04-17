export const isFieldOwnerUser = (user) => {
  if (!user || typeof user !== "object") return false;

  const roleRaw = user.roles ?? user.role;

  if (Array.isArray(roleRaw)) {
    return roleRaw.some((r) => String(r).trim() === "FieldOwner");
  }

  return String(roleRaw ?? "").includes("FieldOwner");
};

export const getHasSubscription = (user) => {
  if (!user || typeof user !== "object") return null;
  return typeof user.hasSubscription === "boolean" ? user.hasSubscription : null;
};

export const resolveOwnerSubscriptionState = (user) => {
  const hasSubscription = getHasSubscription(user);

  if (typeof hasSubscription === "boolean") {
    return {
      checked: true,
      active: hasSubscription,
      reason: hasSubscription ? "" : "Gói hiện tại chưa kích hoạt hoặc đã hết hạn.",
    };
  }

  // Do not lock by default when subscription status is unknown.
  // Lock only when API explicitly reports `hasSubscription = false`.
  return {
    checked: false,
    active: true,
    reason: isFieldOwnerUser(user)
      ? "Đang kiểm tra trạng thái gói. Vui lòng thử lại sau vài giây."
      : "",
  };
};
