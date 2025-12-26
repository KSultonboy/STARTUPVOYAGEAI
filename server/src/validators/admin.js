const PLACE_TYPES = ["landmark", "restaurant", "hotel"];
const BUDGETS = ["simple", "comfort", "luxury"];

function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function parseNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function normalizeTags(value) {
    if (Array.isArray(value)) {
        return value
            .filter((t) => typeof t === "string")
            .map((t) => t.trim())
            .filter(Boolean);
    }
    if (typeof value === "string") {
        return value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }
    return [];
}

function validatePlace(body = {}) {
    const errors = [];

    const name = cleanString(body.name);
    const country = body.country === null ? null : cleanString(body.country) || null;
    const city = cleanString(body.city);
    const type = cleanString(body.type).toLowerCase();
    const short = cleanString(body.short);

    const priceTier = cleanString(body.priceTier).toLowerCase();
    const avgCost = parseNumber(body.avgCost);
    const rating = parseNumber(body.rating);

    const lat = parseNumber(body?.coords?.lat ?? body.lat);
    const lng = parseNumber(body?.coords?.lng ?? body.lng);

    const tags = normalizeTags(body.tags);

    if (!name) errors.push({ field: "name", message: "Name is required" });
    if (!city) errors.push({ field: "city", message: "City is required" });
    if (!PLACE_TYPES.includes(type)) errors.push({ field: "type", message: "Type is invalid" });
    if (!short) errors.push({ field: "short", message: "Short description is required" });
    if (!BUDGETS.includes(priceTier)) errors.push({ field: "priceTier", message: "Price tier is invalid" });
    if (avgCost === null || avgCost < 0) errors.push({ field: "avgCost", message: "Average cost is invalid" });
    if (rating === null || rating < 1 || rating > 5) errors.push({ field: "rating", message: "Rating must be 1-5" });
    if (lat === null || lng === null) errors.push({ field: "coords", message: "Coordinates are required" });

    return {
        ok: errors.length === 0,
        errors,
        value: {
            name,
            country,
            city,
            type,
            short,
            priceTier,
            avgCost: avgCost ?? 0,
            rating: rating ?? 4,
            coords: { lat: lat ?? 0, lng: lng ?? 0 },
            tags,
        },
    };
}

function validateOffer(body = {}) {
    const errors = [];
    const title = cleanString(body.title);
    const city = cleanString(body.city);
    const budget = cleanString(body.budget).toLowerCase();
    const description = cleanString(body.description);

    if (!title) errors.push({ field: "title", message: "Title is required" });
    if (!city) errors.push({ field: "city", message: "City is required" });
    if (!BUDGETS.includes(budget)) errors.push({ field: "budget", message: "Budget is invalid" });
    if (!description) errors.push({ field: "description", message: "Description is required" });

    return { ok: errors.length === 0, errors, value: { title, city, budget, description } };
}

function validateRole(body = {}) {
    const errors = [];
    const role = cleanString(body.role).toLowerCase();
    if (!["user", "admin"].includes(role)) errors.push({ field: "role", message: "Role must be user or admin" });

    return { ok: errors.length === 0, errors, value: { role } };
}

module.exports = { validatePlace, validateOffer, validateRole };
