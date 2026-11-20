import { playerPageUrl, watchUrl, fetchChannelInfo } from "../channels/index.js";
import { extractEmbedUrl, htmlMayContainPlayable, resolveFromHtml, } from "../decrypt/index.js";
import { fetchHtml, UA } from "../http.js";
import { buildMpvCommand, buildVlcCommand } from "../proxy/links.js";
import { proxyLivePlaylist } from "../proxy/live.js";
import { ensureFreshSession, livePlaylistUrl, sessionToResolved, streamReferer, } from "../proxy/session.js";
import { playerLabel, serverProfile, PLAYER_IDS } from "../servers/index.js";
import { fetchEmbedHtmlChain } from "./fetch.js";
async function channelTitle(channelId) {
    try {
        const info = await fetchChannelInfo(channelId);
        return info.name;
    }
    catch {
        return `Channel ${channelId}`;
    }
}
function toServerExport(resolved, channelName, origin, resolveMs) {
    const profile = serverProfile(resolved.server);
    const title = `${channelName} · ${playerLabel(resolved.server)}`;
    const direct = resolved.playableUrl;
    const referer = streamReferer(resolved);
    const live = livePlaylistUrl(resolved.channelId, resolved.server, origin);
    const t = profile.transport;
    // dembed edges require a per-request token minted server-side, so the
    // direct URL is not externally playable — external tools must use the relay.
    const directPlayable = resolved.meta.family !== "dembed";
    const vlcUrl = t.vlcDirectPlayable && directPlayable ? direct : live;
    const mpvUrl = t.mpvDirectPlayable && directPlayable ? direct : live;
    const vlcRef = t.vlcDirectPlayable && directPlayable ? referer || undefined : undefined;
    const mpvRef = t.mpvDirectPlayable && directPlayable ? referer || undefined : undefined;
    const vlcUa = t.vlcDirectPlayable && directPlayable && t.toolsUserAgent ? UA : undefined;
    const mpvUa = t.mpvDirectPlayable && directPlayable && t.toolsUserAgent ? UA : undefined;
    return {
        server: resolved.server,
        label: playerLabel(resolved.server),
        title,
        direct,
        live,
        vlc: buildVlcCommand(vlcUrl, vlcRef, vlcUa),
        mpv: buildMpvCommand(mpvUrl, mpvRef, title, mpvUa),
        isHls: resolved.mimeType === "application/x-mpegURL",
        resolveMs,
        expiresAt: resolved.meta.expiresAt,
    };
}
function resolveErrorMessage(err, server) {
    const msg = err instanceof Error ? err.message : "failed";
    if (server === "cast" && msg.includes("403")) {
        return "cast embed blocked by CDN (HTTP 403)";
    }
    if (msg.startsWith("fetch failed (HTTP ")) {
        return msg.replace(/^fetch failed \(HTTP (\d+)\): https?:\/\/[^\s]+/, "upstream fetch failed (HTTP $1)");
    }
    return msg;
}
async function loadPlayableHtml(channelId, server, knownEmbedUrl) {
    const pageUrl = playerPageUrl(server, channelId);
    let embedUrl = knownEmbedUrl;
    if (!embedUrl) {
        const pageHtml = await fetchHtml(pageUrl, watchUrl(channelId));
        embedUrl = extractEmbedUrl(pageHtml) ?? undefined;
        if (!embedUrl)
            throw new Error(`no embed iframe on ${server} page`);
    }
    const { html, referer } = await fetchEmbedHtmlChain(embedUrl, await fetchHtml(embedUrl, pageUrl), htmlMayContainPlayable);
    return { html, embedUrl: referer };
}
export async function resolveLive(channelId, server) {
    const { html, embedUrl } = await loadPlayableHtml(channelId, server);
    return resolveFromHtml(html, { channelId, server, embedUrl });
}
export async function resolveFromCachedEmbed(channelId, server, embedUrl) {
    const loaded = await loadPlayableHtml(channelId, server, embedUrl);
    return resolveFromHtml(loaded.html, { channelId, server, embedUrl: loaded.embedUrl });
}
function resolveFns(channelId, server) {
    return {
        full: () => resolveLive(channelId, server),
        fromEmbed: (embedUrl) => resolveFromCachedEmbed(channelId, server, embedUrl),
    };
}
export async function handleResolveOne(res, channelId, server, origin) {
    const started = Date.now();
    try {
        const session = await ensureFreshSession(channelId, server, resolveFns(channelId, server));
        const title = await channelTitle(channelId);
        const body = JSON.stringify(toServerExport(sessionToResolved(session), title, origin, Date.now() - started));
        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
        });
        res.end(body);
    }
    catch (err) {
        const body = JSON.stringify({
            server,
            label: playerLabel(server),
            error: resolveErrorMessage(err, server),
            resolveMs: Date.now() - started,
        });
        res.writeHead(502, {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
        });
        res.end(body);
    }
}
export async function handleLivePlaylist(res, channelId, server, origin, childUrl, variant) {
    if (childUrl) {
        const result = await proxyLivePlaylist(channelId, server, origin, resolveFns(channelId, server), childUrl, variant);
        const buf = Buffer.isBuffer(result.body) ? result.body : Buffer.from(result.body);
        res.writeHead(result.status, {
            "Content-Type": result.type,
            "Content-Length": buf.byteLength,
            ...result.headers,
        });
        res.end(buf);
        return;
    }
    const candidateServers = [server, ...PLAYER_IDS.filter((s) => s !== server)];
    let lastResult = null;
    for (const s of candidateServers) {
        try {
            const result = await proxyLivePlaylist(channelId, s, origin, resolveFns(channelId, s), null, variant);
            if (result.status < 400) {
                const buf = Buffer.isBuffer(result.body) ? result.body : Buffer.from(result.body);
                res.writeHead(result.status, {
                    "Content-Type": result.type,
                    "Content-Length": buf.byteLength,
                    ...result.headers,
                });
                res.end(buf);
                return;
            }
            lastResult = result;
        }
        catch {
            // Continue to next candidate server
        }
    }
    if (lastResult) {
        const buf = Buffer.isBuffer(lastResult.body) ? lastResult.body : Buffer.from(lastResult.body);
        res.writeHead(lastResult.status, {
            "Content-Type": lastResult.type,
            "Content-Length": buf.byteLength,
            ...lastResult.headers,
        });
        res.end(buf);
    }
    else {
        res.writeHead(502, {
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
        });
        res.end("All stream servers failed for channel " + channelId);
    }
}
