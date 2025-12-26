const router = require("express").Router();
const { listCountries, listCities, listPlaces } = require("../storage/dataStore");

function clean(s) {
    return String(s || "").trim();
}

// Public: GET /api/locations/countries
router.get("/countries", (req, res) => {
    res.json(listCountries());
});

// Public: GET /api/locations/cities?countryId=...
router.get("/cities", (req, res) => {
    const countryId = typeof req.query.countryId === "string" ? req.query.countryId : null;

    const countries = listCountries();
    const countryMap = new Map(countries.map((c) => [c.id, c]));

    const allCities = listCities();
    let cities = allCities;

    if (countryId) cities = cities.filter((c) => c.countryId === countryId);

    let result = cities.map((c) => ({
        id: c.id,
        name: c.name,
        countryId: c.countryId || null,
        country: countryMap.get(c.countryId)?.name || null,
    }));

    // Fallback: infer from places only if no cities exist AND no country filter
    if (!allCities.length && !countryId) {
        const unique = Array.from(
            new Set(listPlaces().map((p) => clean(p.city)).filter(Boolean))
        );

        result = unique.sort((a, b) => a.localeCompare(b)).map((name) => ({
            id: name,
            name,
            countryId: null,
            country: null,
            inferred: true,
        }));
    }

    res.json(result);
});

module.exports = router;
