export function upstreamRuleFor(playableUrl) {
    let host = "";
    try {
        host = new URL(playableUrl).hostname;
    }
    catch {
        return { refererMode: "optional", rewritePlaylist: true };
    }
    if (/7odxv0l067ka|tiestep|assetrage/i.test(host)) {
        return { refererMode: "required", rewritePlaylist: true };
    }
    if (/bluetier|wideiptv|cdnlivetv/i.test(host)) {
        return { refererMode: "omit", rewritePlaylist: true };
    }
    if (/dreamstream|livelive24/i.test(host)) {
        return { refererMode: "optional", rewritePlaylist: false };
    }
    if (/tiktokcdn/i.test(host)) {
        return { refererMode: "omit", rewritePlaylist: true };
    }
    if (/biboguv|matchora/i.test(host)) {
        return { refererMode: "required", rewritePlaylist: true };
    }
    if (/sytes\.net|ehgembxe/i.test(host)) {
        return { refererMode: "required", forceReferer: "https://ehgembxe.cfd/", rewritePlaylist: true };
    }
    return { refererMode: "optional", rewritePlaylist: true };
}
export function needsRefresh(meta, leadSec = 45, nowSec = Math.floor(Date.now() / 1000)) {
    const expiresAt = Number(meta.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= 0)
        return false;
    return nowSec >= expiresAt - leadSec;
}
