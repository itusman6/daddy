const MAX = 48;
const MAX_INFLIGHT = 2;
const entries = new Map();
const pending = new Map();
let inflight = 0;
const waiters = [];
function acquire() {
    if (inflight < MAX_INFLIGHT) {
        inflight++;
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        waiters.push(() => {
            inflight++;
            resolve();
        });
    });
}
function release() {
    inflight--;
    const next = waiters.shift();
    if (next)
        next();
}
export function getCachedSegment(url) {
    const hit = entries.get(url);
    if (!hit)
        return undefined;
    entries.delete(url);
    entries.set(url, hit);
    return hit;
}
export function putCachedSegment(url, body) {
    if (entries.has(url))
        entries.delete(url);
    entries.set(url, body);
    while (entries.size > MAX) {
        const oldest = entries.keys().next().value;
        if (oldest == null)
            break;
        entries.delete(oldest);
    }
}
export function coalesceSegment(url, work) {
    const hit = getCachedSegment(url);
    if (hit)
        return Promise.resolve(hit);
    const existing = pending.get(url);
    if (existing)
        return existing;
    const job = (async () => {
        await acquire();
        try {
            const body = await work();
            putCachedSegment(url, body);
            return body;
        }
        finally {
            release();
        }
    })().finally(() => {
        pending.delete(url);
    });
    pending.set(url, job);
    return job;
}
