const BUDGETS = ["simple", "comfort", "luxury"];

function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeCity(value) {
    return cleanString(value);
}

function validatePlan(body = {}) {
    const errors = [];
    const city = normalizeCity(body.city);
    const days = Number(body.days);
    const budget = cleanString(body.budget).toLowerCase();
    let interests = [];

    if (!city) errors.push({ field: "city", message: "City is required" });
    if (!Number.isInteger(days) || days < 1 || days > 30) {
        errors.push({ field: "days", message: "Days must be between 1 and 30" });
    }
    if (!BUDGETS.includes(budget)) {
        errors.push({ field: "budget", message: "Budget must be simple, comfort, or luxury" });
    }

    if (Array.isArray(body.interests)) {
        interests = body.interests
            .filter((x) => typeof x === "string")
            .map((x) => x.trim())
            .filter((x) => x.length > 0)
            .slice(0, 20);
    }

    return {
        ok: errors.length === 0,
        errors,
        value: {
            city,
            days: Number.isInteger(days) ? days : 0,
            budget,
            interests,
        },
    };
}

module.exports = { validatePlan };
