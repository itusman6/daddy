const ORDER = [2, 0, 3, 1];
const PARTS = 4;
function atobBinary(value) {
    return Buffer.from(value, "base64").toString("binary");
}
export function decryptEconfig(b64) {
    if (!b64)
        return null;
    const raw = atobBinary(b64);
    const chunkSize = Math.ceil(raw.length / PARTS);
    const chunks = [];
    for (let i = 0, offset = 0; i < PARTS; i++, offset += chunkSize) {
        chunks.push(raw.slice(offset, offset + chunkSize));
    }
    const reordered = [];
    for (let i = 0; i < ORDER.length; i++) {
        const piece = chunks[i].slice(0, 3) + chunks[i].slice(4);
        reordered[ORDER[i]] = atobBinary(piece);
    }
    try {
        const json = Buffer.from(reordered.join(""), "base64").toString("utf8");
        const config = JSON.parse(json);
        if (!config.stream_url && !config.stream_url_nop2p)
            return null;
        return config;
    }
    catch {
        return null;
    }
}
export function econfigPlayableUrl(config) {
    if (config.p2p === false || config.url_nop2p) {
        return config.stream_url_nop2p || config.stream_url;
    }
    return config.stream_url || config.stream_url_nop2p || "";
}
