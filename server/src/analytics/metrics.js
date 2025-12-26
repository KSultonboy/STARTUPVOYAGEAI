const { trackEvent, listEvents, listUsers, listPlaces, listOffers } = require("../storage/dataStore");

function countEvents(type) {
    return listEvents().reduce((acc, e) => (e.type === type ? acc + 1 : acc), 0);
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getSeries(type, days = 14) {
    const now = new Date();
    const buckets = [];
    const index = new Map();
    const counts = new Array(days).fill(0);

    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = getDateKey(d);
        index.set(key, buckets.length);
        buckets.push(key);
    }

    for (const event of listEvents()) {
        if (event.type !== type) continue;
        const key = getDateKey(new Date(event.ts));
        const idx = index.get(key);
        if (idx !== undefined) counts[idx] += 1;
    }

    return { days: buckets, counts };
}

function getOverview(days = 14) {
    const signups = countEvents("register");
    const logins = countEvents("login");
    const plansGenerated = countEvents("plan_generated");

    const signupSeries = getSeries("register", days);
    const loginSeries = getSeries("login", days);
    const planSeries = getSeries("plan_generated", days);

    return {
        totals: {
            users: listUsers().length,
            places: listPlaces().length,
            offers: listOffers().length,
            signups,
            logins,
            plansGenerated,
        },
        series: {
            days: signupSeries.days,
            signups: signupSeries.counts,
            logins: loginSeries.counts,
            plans: planSeries.counts,
        },
    };
}

module.exports = { trackEvent, countEvents, getSeries, getOverview };
