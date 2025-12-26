const path = require("path");

function toNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function parseCsv(value) {
    if (!value) return [];
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function resolveDataPath(value) {
    if (!value) return path.resolve(__dirname, "..", "data", "store.json");
    if (path.isAbsolute(value)) return value;
    return path.resolve(__dirname, "..", value);
}

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const corsOrigins = parseCsv(process.env.CORS_ORIGIN || "*");

const config = {
    env: NODE_ENV,
    isProd,
    port: toNumber(process.env.PORT, 5000),
    bodyLimit: process.env.BODY_LIMIT || "1mb",
    corsOrigins: corsOrigins.length ? corsOrigins : ["*"],
    dataPath: resolveDataPath(process.env.DATA_PATH),
    logFormat:
        process.env.LOG_FORMAT ||
        (isProd
            ? ":id :remote-addr :method :url :status :res[content-length] - :response-time ms"
            : ":id :method :url :status :response-time ms"),
    rateLimit: {
        windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
        max: toNumber(process.env.RATE_LIMIT_MAX, 300),
    },
    authRateLimit: {
        windowMs: toNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
        max: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 40),
    },
    jwt: {
        accessSecret: process.env.JWT_SECRET || "",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "",
        accessTtl: process.env.JWT_ACCESS_TTL || "15m",
        refreshTtl: process.env.JWT_REFRESH_TTL || "30d",
        issuer: process.env.JWT_ISSUER || "voyage-ai",
        audience: process.env.JWT_AUDIENCE || "voyage-ai-mobile",
    },
};

function isWeakSecret(secret) {
    const trimmed = String(secret || "").trim();
    if (!trimmed) return true;
    if (trimmed.length < 16) return true;
    if (trimmed === "your-secret") return true;
    if (trimmed === "voyage-access-secret") return true;
    if (trimmed === "voyage-refresh-secret") return true;
    return false;
}

function isEmpty(value) {
    return !String(value || "").trim();
}

function assertProductionConfig() {
    if (!config.isProd) return;
    const errors = [];

    if (isWeakSecret(config.jwt.accessSecret)) {
        errors.push("JWT_SECRET must be a strong, unique secret (>=16 chars).");
    }
    if (isWeakSecret(config.jwt.refreshSecret)) {
        errors.push("JWT_REFRESH_SECRET must be a strong, unique secret (>=16 chars).");
    }
    if (config.corsOrigins.includes("*")) {
        errors.push("CORS_ORIGIN must be set to explicit origins in production.");
    }

    if (isEmpty(process.env.ADMIN_EMAIL)) errors.push("ADMIN_EMAIL is required in production.");
    if (isEmpty(process.env.ADMIN_PASSWORD)) errors.push("ADMIN_PASSWORD is required in production.");
    if (isEmpty(process.env.ADMIN_NAME)) errors.push("ADMIN_NAME is required in production.");

    if (errors.length) {
        console.error("[config] Invalid production config:");
        errors.forEach((err) => console.error(`- ${err}`));
        process.exit(1);
    }
}

module.exports = { config, assertProductionConfig };
