import { DLHD_BASE } from "../config.js";
export function watchUrl(channelId) {
    return `${DLHD_BASE}/watch.php?id=${channelId}`;
}
export function playerPageUrl(player, channelId) {
    return `${DLHD_BASE}/${player}/stream-${channelId}.php`;
}
