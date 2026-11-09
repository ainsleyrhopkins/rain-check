//purpose: Get Forecast(s)/Data from NWS API
//TODO: Replace for logic to get from up to 10 specificed points
// All times (business hours, outage starts, "days") are in the browser's local time zone.

const MS_PER_HOUR = 60 * 60 * 1000;
const MM_PER_INCH = 25.4;

//get the forecast grid data 
async function fetchNWSData(latitude, longitude) {
    const pointResponse = await fetch(`https://api.weather.gov/points/${latitude},${longitude}`);
    if (!pointResponse.ok) {
        throw new Error(pointResponse.status === 404
            ? 'No forecast for that location (the weather service only covers the US).'
            : `Weather service error (${pointResponse.status}). Try again in a moment.`);
    }
    const point = await pointResponse.json();

    const forecastResponse = await fetch(point.properties.forecastGridData);
    if (!forecastResponse.ok) {
        throw new Error(`Weather service error (${forecastResponse.status}). Try again in a moment.`);
    }
    return forecastResponse.json();
}

// Grid values are an ISO 8601 interval, "<start>/<duration>",
// e.g. "2026-09-13T18:00:00+00:00/PT6H". Return the start and end as Dates.
function parseValidTime(validTime) {
    const [startText, durationText] = validTime.split('/');
    const match = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(durationText);

    if (!match) {
        throw new Error(`Unrecognized validTime duration: ${validTime}`);
    }

    const amount = part => (part ? Number(part) : 0);
    const [, weeks, days, hours, minutes, seconds] = match;
    const durationMs = ((amount(weeks) * 7 + amount(days)) * 24 + amount(hours)) * MS_PER_HOUR
        + amount(minutes) * 60 * 1000
        + amount(seconds) * 1000;

    const start = new Date(startText);
    return { start, end: new Date(start.getTime() + durationMs) };
}

// Forecast blocks that overlap  the start and end 
function blocksInWindow(values, windowStart, windowEnd) {
    return values
        .map(block => ({ ...parseValidTime(block.validTime), value: block.value ?? 0 }))
        .filter(({ start, end }) => start < windowEnd && end > windowStart);
}

const maxValue = blocks => blocks.reduce((max, block) => Math.max(max, block.value), 0);

/*Checks the outage itself plus  buffer hours on BOTH sides of it.
 *   date: 'YYYY-MM-DD', startTime: 'HH:MM' (24)
 *   duration, buffer: hours; threshold: inches of rain
 *
 * Returns { status: 'Danger' | 'Caution' | 'Safe',
 *           rainAmount (inches, total across buffer + outage + buffer),
 *           rainChance (0–100, the highest chance in the window),
 *           closestRain ({ time, side: 'before' | 'after' } or null; see closestRain below) }
 */
export async function confirmOutage({ latitude, longitude, date, startTime, duration, buffer, threshold }) {
    const outageStart = new Date(`${date}T${startTime}`);
    const windowStart = new Date(outageStart.getTime() - buffer * MS_PER_HOUR);
    const windowEnd = new Date(outageStart.getTime() + (duration + buffer) * MS_PER_HOUR);

    const forecast = await fetchNWSData(latitude, longitude);
    const rainfall = forecast.properties.quantitativePrecipitation.values; // mm per block
    const chances = forecast.properties.probabilityOfPrecipitation.values; // percent

    // No data past the forecast's range would otherwise read as "no rain"
    const covered = blocksInWindow(rainfall, windowStart, windowEnd);
    const coveredFrom = Math.min(...covered.map(b => b.start.getTime()));
    const coveredTo = Math.max(...covered.map(b => b.end.getTime()));
    if (!covered.length || coveredFrom > windowStart.getTime() || coveredTo < windowEnd.getTime()) {
        throw new Error('The forecast doesn’t cover that time yet. Pick a time within the next week.');
    }

    // Total rain across the whole window, counted the same way as recommendOutage
    const rainAmount = rainTotal(covered, windowStart, windowEnd);
    const rainChance = maxValue(blocksInWindow(chances, windowStart, windowEnd));

    // Rain must stay strictly below the threshold to pass (same rule as recommendOutage)
    let status = 'Safe';
    if (rainAmount >= threshold) status = 'Danger';
    else if (rainAmount > 0) status = 'Caution';

    return {
        status,
        rainAmount,
        rainChance: Math.round(rainChance),
        // Same rule as recommendOutage: nearest rain before or after the window
        closestRain: closestRain(rainEvents(toBlocks(rainfall)), windowStart, windowEnd),
    };
}

/* ---------------- Recommend an outage ---------------- */

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_RECOMMENDATIONS = 3;

const toBlocks = values => values.map(block => ({ ...parseValidTime(block.validTime), value: block.value ?? 0 }));

// Total rain (inches) between from and to. A forecast block that's only partly inside the
// window counts for that fraction of its rain (rain is assumed to fall evenly across a block).
function rainTotal(rainBlocks, from, to) {
    let mm = 0;
    for (const block of rainBlocks) {
        const overlap = Math.min(block.end, to) - Math.max(block.start, from);
        if (overlap > 0) mm += block.value * (overlap / (block.end - block.start));
    }
    return mm / MM_PER_INCH;
}

// Highest chance of rain (0–100) among blocks overlapping from–to
const maxChance = (chanceBlocks, from, to) => maxValue(chanceBlocks.filter(b => b.start < to && b.end > from));

// Back-to-back blocks with any rain, merged into rain events: [{ start, end }]
function rainEvents(rainBlocks) {
    const events = [];
    for (const block of rainBlocks.filter(b => b.value > 0).sort((a, b) => a.start - b.start)) {
        const last = events[events.length - 1];
        if (last && block.start <= last.end) last.end = new Date(Math.max(last.end, block.end));
        else events.push({ start: block.start, end: block.end });
    }
    return events;
}

// The rain event closest to the window: { time, side: 'during' | 'before' | 'after' }, or null if none.
//   during: rain is forecast inside the window itself (time is when that rain starts, or the
//           window start if it was already raining); this wins over any rain outside the window.
//   before: time is when that rain ends; after: time is when it starts.
function closestRain(events, from, to) {
    const during = events.find(event => event.start < to && event.end > from);
    if (during) return { time: new Date(Math.max(during.start, from)), side: 'during' };

    let best = null;
    for (const event of events) {
        let distance, side, time;
        if (event.end <= from) { distance = from - event.end; side = 'before'; time = event.end; }
        else { distance = event.start - to; side = 'after'; time = event.start; }
        if (!best || distance < best.distance) best = { time, side, distance };
    }
    return best && { time: best.time, side: best.side };
}

// Local Date for the given day at 'HH:MM'
function atTime(day, hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const date = new Date(day);
    date.setHours(h, m, 0, 0);
    return date;
}

// Only considers weekdays
// If the end time is at or before the start time, business hours run past midnight
// (e.g. 22:00–06:00 is Mon 10 PM to Tue 6 AM).
function overlapsBusinessHours(from, to, startHHMM, endHHMM) {
    const day = new Date(from);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - 1); // yesterday's hours may run past midnight into the window
    for (; day < to; day.setDate(day.getDate() + 1)) {
        const weekday = day.getDay();
        if (weekday === 0 || weekday === 6) continue;
        const open = atTime(day, startHHMM);
        const close = atTime(day, endHHMM);
        if (close <= open) close.setDate(close.getDate() + 1);
        if (open < to && close > from) return true;
    }
    return false;
}

const localDayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const toHundredths = inches => Math.round(inches * 100);

// Best first: less rain (to 0.01 in), then lower chance, then the preferred day, then earlier
function compareSlots(a, b) {
    return toHundredths(a.rainAmount) - toHundredths(b.rainAmount)
        || a.rainChance - b.rainChance
        || Number(b.preferred) - Number(a.preferred)
        || a.start - b.start;
}

/*
 * Finds the best outage windows in the next `searchDays` days.
 *   duration, buffer: hours; threshold: inches of rain; searchDays: 1–7
 *   outsideBusinessHours: boolean; businessHoursStart/End: 'HH:MM' (24-hour) when it's on
 *   preferredDay: 'Monday'…'Sunday' or null
 *
 * Returns { recommendations: up to 3 of
 *             { start, end (Dates, the outage itself), rainAmount (inches, total in buffer + outage + buffer),
 *               rainChance (0–100, highest in that window), closestRain ({ time, side } or null),
 *               preferred (boolean, starts on the preferred day) },
 *           forecastEnd (Date, when the forecast runs out),
 *           cutShort (true if some start times weren't checked because the forecast ran out) }
 *
 * How it works:
 *  1. Every whole hour from now until `searchDays` × 24 hours from now is a possible outage start.
 *  2. Each start's window is buffer + outage + buffer. A start is skipped if the forecast
 *     doesn't cover its whole window, or (when Outside Business Hours is on) if any part of
 *     the window touches Monday–Friday business hours.
 *  3. The window's total rain must be strictly less than the threshold.
 *  4. Each day keeps only its best start (by compareSlots); the 3 best days are returned, best first.
 */
export async function recommendOutage({
    latitude, longitude, duration, buffer, threshold, searchDays,
    outsideBusinessHours, businessHoursStart, businessHoursEnd, preferredDay, now = new Date(),
}) {
    const forecast = await fetchNWSData(latitude, longitude);
    const rainBlocks = toBlocks(forecast.properties.quantitativePrecipitation.values); // mm per block
    const chanceBlocks = toBlocks(forecast.properties.probabilityOfPrecipitation.values); // percent
    if (!rainBlocks.length) throw new Error('The weather service has no rain forecast for that location right now.');

    const forecastStart = Math.min(...rainBlocks.map(b => b.start.getTime()));
    const forecastEnd = Math.max(...rainBlocks.map(b => b.end.getTime()));
    const events = rainEvents(rainBlocks);

    const firstStart = new Date(now);
    if (firstStart.getMinutes() || firstStart.getSeconds() || firstStart.getMilliseconds()) {
        firstStart.setHours(firstStart.getHours() + 1, 0, 0, 0); // next whole hour
    }
    const searchEnd = now.getTime() + searchDays * 24 * MS_PER_HOUR;

    const bestByDay = new Map();
    let cutShort = false;
    for (let t = firstStart.getTime(); t < searchEnd; t += MS_PER_HOUR) {
        const start = new Date(t);
        const end = new Date(t + duration * MS_PER_HOUR);
        const from = new Date(t - buffer * MS_PER_HOUR);
        const to = new Date(end.getTime() + buffer * MS_PER_HOUR);

        if (to.getTime() > forecastEnd) { cutShort = true; continue; }
        if (from.getTime() < forecastStart) continue;
        if (outsideBusinessHours && overlapsBusinessHours(from, to, businessHoursStart, businessHoursEnd)) continue;

        const rainAmount = rainTotal(rainBlocks, from, to);
        if (rainAmount >= threshold) continue;

        const slot = {
            start, end, rainAmount,
            rainChance: Math.round(maxChance(chanceBlocks, from, to)),
            closestRain: closestRain(events, from, to),
            preferred: WEEKDAY_NAMES[start.getDay()] === preferredDay,
        };
        const key = localDayKey(start);
        const current = bestByDay.get(key);
        if (!current || compareSlots(slot, current) < 0) bestByDay.set(key, slot);
    }

    const recommendations = [...bestByDay.values()].sort(compareSlots).slice(0, MAX_RECOMMENDATIONS);
    return { recommendations, forecastEnd: new Date(forecastEnd), cutShort };
}

// 4 decimal places (~11 m): what the weather service uses, and readable in Settings
const roundCoordinate = value => Math.round(value * 10000) / 10000;

// The browser's location, as { latitude, longitude }. Prompts the user the first time.
// On failure the error has `reason`: 'unsupported' | 'denied' | 'unavailable'.
export function getBrowserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(Object.assign(
                new Error('This browser can’t share its location. Add a coordinate in Settings.'),
                { reason: 'unsupported' }));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({
                latitude: roundCoordinate(coords.latitude),
                longitude: roundCoordinate(coords.longitude),
            }),
            (error) => reject(error.code === error.PERMISSION_DENIED
                ? Object.assign(new Error('Location access was denied. Allow it, or add a coordinate in Settings.'), { reason: 'denied' })
                : Object.assign(new Error('Couldn’t get your location. Try again, or add a coordinate in Settings.'), { reason: 'unavailable' })),
            { timeout: 15000, maximumAge: 10 * 60 * 1000 },
        );
    });
}
