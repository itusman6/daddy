export function extractWikiSportLiveId(html) {
    return html.match(/fid\s*=\s*["']([^"']+)["']/)?.[1] ?? null;
}
export function buildWikiPhpUrl(liveId) {
    return `https://igniteandship.com/wiki.php?player=desktop&live=${encodeURIComponent(liveId)}`;
}
export function isWikiSportPage(url) {
    return url.includes("wikisport.info");
}
