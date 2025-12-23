const { trackEvent, listEvents } = require("../storage/dataStore");

function countEvents(type) {
    const events = listEvents();
    return events.filter((e) => e.type === type).length;
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
    const counts = [];
    const events = listEvents();

    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        buckets.push(getDateKey(d));
        counts.push(0);
    }

    events.forEach((event) => {
        if (event.type !== type) return;
        const key = getDateKey(new Date(event.ts));
        const idx = buckets.indexOf(key);
        if (idx >= 0) counts[idx] += 1;
    });

    return { days: buckets, counts };
}

module.exports = { trackEvent, countEvents, getSeries };
