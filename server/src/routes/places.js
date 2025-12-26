// server/src/routes/places.js
const router = require("express").Router();
const { listPlaces, findPlaceByKey } = require("../storage/dataStore");
const { requireAuth, requirePermission } = require("../auth/middleware");
const { PERMISSIONS } = require("../auth/permissions");

// GET /api/places?city=Tashkent&type=all
router.get("/", requireAuth, requirePermission(PERMISSIONS.PLACES_READ), (req, res) => {
    const city = typeof req.query.city === "string" ? req.query.city.trim().toLowerCase() : null;
    const type = typeof req.query.type === "string" ? req.query.type.trim().toLowerCase() : "all";

    let list = listPlaces();
    if (city) list = list.filter((p) => String(p.city || "").trim().toLowerCase() === city);
    if (type !== "all") list = list.filter((p) => p.type === type);

    res.json(list);
});

// GET /api/places/:id  (id OR slug OR name)
router.get("/:id", requireAuth, requirePermission(PERMISSIONS.PLACES_READ), (req, res) => {
    const found = findPlaceByKey(req.params.id);
    if (!found) return res.status(404).json({ message: "Place not found" });
    res.json(found);
});

module.exports = router;
