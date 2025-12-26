const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { places: seedPlaces } = require("../data/places");
const { offers: seedOffers } = require("../data/offers");

const DEFAULT_DATA_PATH = path.resolve(__dirname, "..", "..", "data", "store.json");

function resolveDataPath(value) {
    if (!value) return DEFAULT_DATA_PATH;
    if (path.isAbsolute(value)) return value;
    return path.resolve(__dirname, "..", "..", value);
}

const DATA_PATH = resolveDataPath(process.env.DATA_PATH);
const EVENT_RETENTION_DAYS = Number(process.env.EVENT_RETENTION_DAYS || 90);

// refresh token cleanup
const REFRESH_TOKEN_RETENTION_DAYS = Number(process.env.REFRESH_TOKEN_RETENTION_DAYS || 60);
const MAX_REFRESH_TOKENS_PER_USER = Number(process.env.MAX_REFRESH_TOKENS_PER_USER || 10);

const STATE_VERSION = 2;

function ensureDir() {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
}

function clonePlace(place) {
    return {
        ...place,
        coords: place.coords ? { ...place.coords } : { lat: 0, lng: 0 },
        tags: Array.isArray(place.tags) ? [...place.tags] : [],
    };
}

function cloneOffer(offer) {
    return { ...offer };
}

function emptyState() {
    return {
        version: STATE_VERSION,
        meta: { nextUserId: 1 },
        users: [],
        refreshTokens: [], // [{ tokenHash, userId, createdAt }]
        places: [],
        offers: [],
        countries: [],
        cities: [],
        events: [],
    };
}

function seedState() {
    const state = emptyState();
    state.places = seedPlaces.map(clonePlace);
    state.offers = seedOffers.map(cloneOffer);
    return state;
}

function mergeSeeds(state) {
    let changed = false;

    const placeIds = new Set(state.places.map((p) => p.id));
    seedPlaces.forEach((place) => {
        if (!placeIds.has(place.id)) {
            state.places.push(clonePlace(place));
            changed = true;
        }
    });

    const offerIds = new Set(state.offers.map((o) => o.id));
    seedOffers.forEach((offer) => {
        if (!offerIds.has(offer.id)) {
            state.offers.push(cloneOffer(offer));
            changed = true;
        }
    });

    return changed;
}

function normalizeState(data) {
    const state = emptyState();
    const source = data && typeof data === "object" ? data : {};

    state.version = Number(source.version) || STATE_VERSION;
    state.meta = typeof source.meta === "object" && source.meta ? { ...state.meta, ...source.meta } : state.meta;

    if (Array.isArray(source.users)) state.users = source.users;
    if (Array.isArray(source.places)) state.places = source.places;
    if (Array.isArray(source.offers)) state.offers = source.offers;
    if (Array.isArray(source.countries)) state.countries = source.countries;
    if (Array.isArray(source.cities)) state.cities = source.cities;
    if (Array.isArray(source.events)) state.events = source.events;

    // refreshTokens migration: accept old formats
    if (Array.isArray(source.refreshTokens)) {
        state.refreshTokens = source.refreshTokens
            .map((t) => {
                if (!t) return null;

                // if old stored raw token => convert to hash
                if (typeof t === "string") {
                    return { tokenHash: hashToken(t), userId: null, createdAt: Date.now() };
                }

                if (typeof t === "object") {
                    const tokenHash = String(t.tokenHash || "").trim();
                    const tokenRaw = String(t.token || "").trim();

                    return {
                        tokenHash: tokenHash || (tokenRaw ? hashToken(tokenRaw) : ""),
                        userId: t.userId ? String(t.userId) : null,
                        createdAt: Number(t.createdAt) || Date.now(),
                    };
                }

                return null;
            })
            .filter((x) => x && x.tokenHash);
    }

    if (!Array.isArray(source.places)) state.places = seedPlaces.map(clonePlace);
    if (!Array.isArray(source.offers)) state.offers = seedOffers.map(cloneOffer);
    if (!Array.isArray(source.countries)) state.countries = [];
    if (!Array.isArray(source.cities)) state.cities = [];

    if (!Number.isInteger(state.meta.nextUserId) || state.meta.nextUserId < 1) {
        const maxId = state.users.reduce((acc, user) => {
            const num = Number(user.id);
            return Number.isFinite(num) ? Math.max(acc, num) : acc;
        }, 0);
        state.meta.nextUserId = maxId + 1;
    }

    return state;
}

function writeState(nextState) {
    ensureDir();
    const tmpPath = `${DATA_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(nextState, null, 2), "utf8");
    fs.renameSync(tmpPath, DATA_PATH);
}

function loadState() {
    ensureDir();
    if (!fs.existsSync(DATA_PATH)) {
        const seeded = seedState();
        writeState(seeded);
        return seeded;
    }

    try {
        const raw = fs.readFileSync(DATA_PATH, "utf8");
        const parsed = JSON.parse(raw);
        const normalized = normalizeState(parsed);

        pruneRefreshTokens(normalized);
        pruneEvents(normalized);

        if (mergeSeeds(normalized)) writeState(normalized);
        return normalized;
    } catch {
        const backupPath = `${DATA_PATH}.corrupt.${Date.now()}`;
        try { fs.renameSync(DATA_PATH, backupPath); } catch { }
        const seeded = seedState();
        writeState(seeded);
        return seeded;
    }
}

const state = loadState();
let saveTimer = null;

function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        writeState(state);
    }, 200);
    if (typeof saveTimer.unref === "function") saveTimer.unref();
}

function flush() {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    writeState(state);
}

function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function pruneEvents(st = state) {
    if (!Number.isFinite(EVENT_RETENTION_DAYS) || EVENT_RETENTION_DAYS <= 0) return;
    const cutoff = Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    st.events = (st.events || []).filter((e) => e && Number(e.ts) >= cutoff);
}

function pruneRefreshTokens(st = state) {
    if (!Number.isFinite(REFRESH_TOKEN_RETENTION_DAYS) || REFRESH_TOKEN_RETENTION_DAYS <= 0) return;
    const cutoff = Date.now() - REFRESH_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    st.refreshTokens = (st.refreshTokens || [])
        .filter((t) => t && t.tokenHash)
        .filter((t) => Number(t.createdAt) >= cutoff);

    // cap per user
    if (Number.isFinite(MAX_REFRESH_TOKENS_PER_USER) && MAX_REFRESH_TOKENS_PER_USER > 0) {
        const byUser = new Map();
        for (const t of st.refreshTokens) {
            const k = String(t.userId || "null");
            if (!byUser.has(k)) byUser.set(k, []);
            byUser.get(k).push(t);
        }
        const next = [];
        for (const arr of byUser.values()) {
            arr.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
            next.push(...arr.slice(0, MAX_REFRESH_TOKENS_PER_USER));
        }
        st.refreshTokens = next;
    }
}

// ---------------- Locations ----------------
function listCountries() { return state.countries.slice(); }
function findCountryById(id) { return state.countries.find((c) => c.id === id) || null; }
function findCountryByName(name) {
    const key = normalizeKey(name);
    return state.countries.find((c) => normalizeKey(c.name) === key) || null;
}
function createCountry({ name }) {
    const country = { id: makeId("country"), name: String(name || "").trim(), createdAt: new Date().toISOString() };
    state.countries.push(country);
    scheduleSave();
    return country;
}
function deleteCountry(id) {
    const idx = state.countries.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const removed = state.countries.splice(idx, 1)[0];
    state.cities = state.cities.filter((c) => c.countryId !== id);
    scheduleSave();
    return removed;
}
function listCities() { return state.cities.slice(); }
function findCityById(id) { return state.cities.find((c) => c.id === id) || null; }
function findCityByName(name, countryId) {
    const key = normalizeKey(name);
    return state.cities.find((c) => normalizeKey(c.name) === key && (countryId ? c.countryId === countryId : true)) || null;
}
function createCity({ name, countryId }) {
    const city = { id: makeId("city"), name: String(name || "").trim(), countryId, createdAt: new Date().toISOString() };
    state.cities.push(city);
    scheduleSave();
    return city;
}
function deleteCity(id) {
    const idx = state.cities.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const removed = state.cities.splice(idx, 1)[0];
    scheduleSave();
    return removed;
}

// ---------------- Users ----------------
function listUsers() { return state.users.slice(); }

function createUser({ name, email, passwordHash, role = "user", avatar = null }) {
    const user = {
        id: String(state.meta.nextUserId++),
        name,
        email: normalizeEmail(email),
        passwordHash,
        role,
        avatar: avatar || null,
        createdAt: new Date().toISOString(),
    };
    state.users.push(user);
    scheduleSave();
    return user;
}

function findUserByEmail(email) {
    const normalized = normalizeEmail(email);
    return state.users.find((u) => u.email === normalized) || null;
}
function findUserById(id) { return state.users.find((u) => u.id === id) || null; }

function updateUserRole(id, role) {
    const user = findUserById(id);
    if (!user) return null;
    user.role = role;
    scheduleSave();
    return user;
}

function updateUserProfile(id, updates = {}) {
    const user = findUserById(id);
    if (!user) return null;

    if (typeof updates.name === "string" && updates.name.trim()) user.name = updates.name.trim();

    if (updates.avatar === null) user.avatar = null;
    else if (typeof updates.avatar === "string" && updates.avatar.trim()) user.avatar = updates.avatar.trim();

    user.updatedAt = new Date().toISOString();
    scheduleSave();
    return user;
}

// ---------------- Refresh tokens (tokenHash ONLY) ----------------
// addRefreshToken(tokenHash, userId)
function addRefreshToken(tokenHash, userId) {
    const th = String(tokenHash || "").trim();
    if (!th) return;

    pruneRefreshTokens(state);

    state.refreshTokens.push({
        tokenHash: th,
        userId: String(userId),
        createdAt: Date.now(),
    });
    scheduleSave();
}

function revokeRefreshToken(tokenHash) {
    const th = String(tokenHash || "").trim();
    if (!th) return;

    const next = state.refreshTokens.filter((t) => t.tokenHash !== th);
    if (next.length !== state.refreshTokens.length) {
        state.refreshTokens = next;
        scheduleSave();
    }
}

function isRefreshTokenActive(tokenHash, userId) {
    const th = String(tokenHash || "").trim();
    if (!th) return false;
    return state.refreshTokens.some((t) => t.tokenHash === th && String(t.userId) === String(userId));
}

// ---------------- Places ----------------
function listPlaces() { return state.places.slice(); }
function findPlaceById(id) { return state.places.find((p) => p.id === id) || null; }

function findPlaceByKey(key) {
    const raw = String(key || "").trim();
    if (!raw) return null;

    const byId = state.places.find((p) => p.id === raw);
    if (byId) return byId;

    const nk = normalizeKey(raw);
    const bySlug = state.places.find((p) => normalizeKey(p.slug) === nk);
    if (bySlug) return bySlug;

    const byName = state.places.find((p) => normalizeKey(p.name) === nk);
    if (byName) return byName;

    return null;
}

function createPlace(data) {
    const place = { id: makeId("place"), ...data };
    if (!place.slug && place.name) place.slug = normalizeKey(place.name);
    state.places.unshift(place);
    scheduleSave();
    return place;
}

function updatePlace(id, data) {
    const idx = state.places.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const merged = { ...state.places[idx], ...data, id };
    if (!merged.slug && merged.name) merged.slug = normalizeKey(merged.name);

    state.places[idx] = merged;
    scheduleSave();
    return state.places[idx];
}

function deletePlace(id) {
    const idx = state.places.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const removed = state.places.splice(idx, 1)[0];
    scheduleSave();
    return removed;
}

function deletePlaceByKey(key) {
    const place = findPlaceByKey(key);
    if (!place) return null;
    return deletePlace(place.id);
}

// ---------------- Offers ----------------
function listOffers() { return state.offers.slice(); }
function findOfferById(id) { return state.offers.find((o) => o.id === id) || null; }

function createOffer(data) {
    const offer = { id: makeId("offer"), ...data };
    state.offers.unshift(offer);
    scheduleSave();
    return offer;
}

function updateOffer(id, data) {
    const idx = state.offers.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    state.offers[idx] = { ...state.offers[idx], ...data, id };
    scheduleSave();
    return state.offers[idx];
}

function deleteOffer(id) {
    const idx = state.offers.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    const removed = state.offers.splice(idx, 1)[0];
    scheduleSave();
    return removed;
}

// ---------------- Analytics events ----------------
function trackEvent(type, meta) {
    state.events.push({ type, meta: meta || null, ts: Date.now() });
    pruneEvents(state);
    scheduleSave();
}

function listEvents() {
    return state.events.slice();
}

module.exports = {
    DATA_PATH,
    flush,
    hashToken, // IMPORTANT: auth/store uses this for refresh tokens now

    listUsers,
    createUser,
    findUserByEmail,
    findUserById,
    updateUserRole,
    updateUserProfile,

    addRefreshToken,
    revokeRefreshToken,
    isRefreshTokenActive,

    listPlaces,
    findPlaceById,
    findPlaceByKey,
    createPlace,
    updatePlace,
    deletePlace,
    deletePlaceByKey,

    listOffers,
    findOfferById,
    createOffer,
    updateOffer,
    deleteOffer,

    listCountries,
    findCountryById,
    findCountryByName,
    createCountry,
    deleteCountry,
    listCities,
    findCityById,
    findCityByName,
    createCity,
    deleteCity,

    trackEvent,
    listEvents,
};
