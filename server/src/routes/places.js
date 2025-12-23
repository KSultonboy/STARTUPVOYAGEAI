const router = require("express").Router();
const { listPlaces, findPlaceById } = require("../storage/dataStore");
const { requireAuth, requirePermission } = require("../auth/middleware");
const { PERMISSIONS } = require("../auth/permissions");

// GET /api/places?city=Tashkent&type=all&budget=simple|comfort|luxury
router.get("/", requireAuth, requirePermission(PERMISSIONS.PLACES_READ), (req, res) => {
    const city = typeof req.query.city === "string" ? req.query.city.toLowerCase() : null;
    const type = typeof req.query.type === "string" ? req.query.type.toLowerCase() : "all";

    let list = listPlaces();
    if (city) list = list.filter((p) => p.city.toLowerCase() === city);
    if (type !== "all") list = list.filter((p) => p.type === type);

    res.json(list);
});

// GET /api/places/:id
router.get("/:id", requireAuth, requirePermission(PERMISSIONS.PLACES_READ), (req, res) => {
    const found = findPlaceById(req.params.id);
    if (!found) return res.status(404).json({ message: "Place not found" });
    res.json(found);
});

module.exports = router;
