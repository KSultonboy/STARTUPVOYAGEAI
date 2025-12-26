// server/src/planner/plan.js
const { listPlaces } = require("../storage/dataStore");

const budgetConfig = {
    simple: { allowedTiers: ["simple"], landmarksPerDay: 2, restaurantsPerDay: 1, label: "Simple" },
    comfort: { allowedTiers: ["simple", "comfort"], landmarksPerDay: 2, restaurantsPerDay: 2, label: "Comfort" },
    luxury: { allowedTiers: ["simple", "comfort", "luxury"], landmarksPerDay: 3, restaurantsPerDay: 2, label: "Luxury" },
};

function scorePlace(place, interests = [], budget) {
    let score = (place.rating || 4) * (budget === "luxury" ? 12 : 10);

    const interestTags = new Set((interests || []).map((x) => String(x).toLowerCase()));
    const placeTags = new Set((place.tags || []).map((x) => String(x).toLowerCase()));
    for (const t of interestTags) {
        if (placeTags.has(t)) score += 12;
    }

    if (place.type === "landmark") score += 8;

    const cost = Number(place.avgCost || 0);
    if (budget === "simple") score += Math.max(0, 40 - cost) * 0.6;
    else if (budget === "comfort") score += Math.max(0, 40 - cost) * 0.3;
    else score += Math.min(cost, 200) * 0.08;

    if (budget === "luxury" && place.priceTier === "luxury") score += 14;
    if (budget === "comfort" && place.priceTier === "comfort") score += 10;
    if (budget === "simple" && place.priceTier === "simple") score += 8;

    return score;
}

function pickBest(list, count, interests, budget) {
    return [...list]
        .sort((a, b) => scorePlace(b, interests, budget) - scorePlace(a, interests, budget))
        .slice(0, count);
}

function takeWithWrap(list, startIndex, count) {
    if (!list.length || count <= 0) return [];
    const items = [];
    for (let i = 0; i < count; i += 1) items.push(list[(startIndex + i) % list.length]);
    return items;
}

function makePlan({ city, days, budget, interests }) {
    const config = budgetConfig[budget] || budgetConfig.comfort;
    const allowedTiers = config.allowedTiers;

    const cityKey = String(city || "").trim().toLowerCase();

    const cityPlaces = listPlaces().filter(
        (p) => String(p.city || "").trim().toLowerCase() === cityKey
    );

    const hotels = cityPlaces.filter((p) => p.type === "hotel" && allowedTiers.includes(p.priceTier));
    const restaurants = cityPlaces.filter((p) => p.type === "restaurant" && allowedTiers.includes(p.priceTier));
    const landmarks = cityPlaces.filter((p) => p.type === "landmark");

    const chosenHotel = pickBest(hotels, 1, interests, budget)[0] || null;

    const restaurantCount = Math.max(config.restaurantsPerDay * days, config.restaurantsPerDay + 1);
    const landmarkCount = Math.max(config.landmarksPerDay * days, config.landmarksPerDay + 1);

    const chosenRestaurants = pickBest(restaurants, restaurantCount, interests, budget);
    const chosenLandmarks = pickBest(landmarks, landmarkCount, interests, budget);

    const itinerary = [];
    let restIdx = 0;
    let landIdx = 0;

    for (let d = 1; d <= days; d++) {
        const dayLandmarks = takeWithWrap(chosenLandmarks, landIdx, config.landmarksPerDay);
        landIdx += config.landmarksPerDay;

        const dayRestaurants = takeWithWrap(chosenRestaurants, restIdx, config.restaurantsPerDay);
        restIdx += config.restaurantsPerDay;

        const dayItems = [
            ...dayLandmarks.map((x) => ({ kind: "landmark", place: x })),
            ...dayRestaurants.map((x) => ({ kind: "restaurant", place: x })),
            ...(chosenHotel ? [{ kind: "hotel", place: chosenHotel }] : []),
        ];

        const dayCost =
            dayLandmarks.reduce((s, x) => s + Number(x.avgCost || 0), 0) +
            dayRestaurants.reduce((s, x) => s + Number(x.avgCost || 0), 0) +
            (chosenHotel ? Number(chosenHotel.avgCost || 0) / days : 0);

        itinerary.push({
            day: d,
            title: `Day ${d} in ${city}`,
            items: dayItems,
            estimatedCost: Math.round(dayCost),
        });
    }

    const total = itinerary.reduce((s, x) => s + Number(x.estimatedCost || 0), 0);

    return {
        city,
        days,
        budget,
        interests,
        summary: {
            level: budget,
            totalEstimatedCost: total,
            hotel: chosenHotel,
        },
        itinerary,
    };
}

module.exports = { makePlan };
