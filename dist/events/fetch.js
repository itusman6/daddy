import { DLHD_BASE } from "../config.js";
import { fetchHtml } from "../http.js";
import { parseHomeSections, parseSchedulePayload } from "./parse.js";
const BASE = DLHD_BASE.replace(/\/+$/, "");
const FEED_TTL_MS = 2 * 60 * 1000;
let feedCache = null;
async function fetchRemoteDays(endpoint) {
    const payload = await fetchHtml(`${BASE}${endpoint}`, `${BASE}/`);
    return parseSchedulePayload(payload) ?? [];
}
export async function fetchEventsFeed() {
    if (feedCache && Date.now() - feedCache.at < FEED_TTL_MS) {
        return feedCache.feed;
    }
    const home = await fetchHtml(`${BASE}/`, `${BASE}/`);
    const homeSections = parseHomeSections(home);
    const remoteDays = await Promise.all(homeSections.map((section) => section.endpoint ? fetchRemoteDays(section.endpoint).catch(() => []) : null));
    const sections = [];
    homeSections.forEach((section, i) => {
        const days = remoteDays[i] ?? section.days;
        if (days.length > 0)
            sections.push({ title: section.title, days });
    });
    const feed = { fetchedAt: new Date().toISOString(), sections };
    feedCache = { at: Date.now(), feed };
    return feed;
}
