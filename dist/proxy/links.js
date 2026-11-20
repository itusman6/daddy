function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}
export function buildProxyUrl(directUrl, referer, origin) {
    const params = new URLSearchParams({ url: directUrl });
    if (referer)
        params.set("referer", referer);
    return `${origin.replace(/\/$/, "")}/api/proxy?${params}`;
}
export function buildVlcCommand(playUrl, referer, userAgent) {
    const parts = ["vlc", shellQuote(playUrl)];
    if (userAgent)
        parts.push(`:http-user-agent=${shellQuote(userAgent)}`);
    if (referer)
        parts.push(`:http-referrer=${shellQuote(referer)}`);
    return parts.join(" ");
}
export function buildMpvCommand(playUrl, referer, title, userAgent) {
    const parts = ["mpv"];
    if (title)
        parts.push(`--force-media-title=${shellQuote(title)}`);
    if (userAgent)
        parts.push(`--user-agent=${shellQuote(userAgent)}`);
    if (referer)
        parts.push(`--referrer=${shellQuote(referer)}`);
    parts.push(shellQuote(playUrl));
    return parts.join(" ");
}
