const PERMISSIONS = {
    PLAN_READ: "plan:read",
    PLAN_WRITE: "plan:write",
    PLACES_READ: "places:read",
    OFFERS_READ: "offers:read",
    USER_ADMIN: "user:admin",
};

const ROLE_PERMISSIONS = {
    user: [
        PERMISSIONS.PLAN_READ,
        PERMISSIONS.PLAN_WRITE,
        PERMISSIONS.PLACES_READ,
        PERMISSIONS.OFFERS_READ,
    ],
    admin: ["*"],
};

function resolvePermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
}

function hasPermission(list, required) {
    if (list.includes("*")) return true;
    if (Array.isArray(required)) return required.every((p) => list.includes(p));
    return list.includes(required);
}

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, resolvePermissions, hasPermission };
