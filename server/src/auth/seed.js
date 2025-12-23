const bcrypt = require("bcryptjs");
const { createUser, findUserByEmail } = require("./store");

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

async function seedAdmin() {
    const emailRaw = process.env.ADMIN_EMAIL;
    const passwordRaw = process.env.ADMIN_PASSWORD;
    const nameRaw = process.env.ADMIN_NAME;

    const email = normalizeEmail(emailRaw);
    const password = String(passwordRaw || "").trim();
    const name = String(nameRaw || "Admin").trim();

    // dev’da bo‘sh bo‘lishi mumkin — seed qilmaymiz
    if (!email || !password) {
        console.log("[seed] admin env not set, skipping");
        return;
    }

    if (findUserByEmail(email)) {
        console.log("[seed] admin exists", email);
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    createUser({
        name,
        email,
        passwordHash,
        role: "admin",
    });

    console.log("[seed] admin created", email);
}

module.exports = { seedAdmin };
