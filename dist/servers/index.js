import { castServer } from "./cast.js";
import { castingServer } from "./casting.js";
import { hubServer } from "./hub.js";
import { playerServer } from "./player.js";
import { plusServer } from "./plus.js";
import { streamServer } from "./stream.js";
import { watchServer } from "./watch.js";
export { PLAYERS, PLAYER_IDS, playerLabel, DEFAULT_SERVER } from "./kinds.js";
const SERVER_PROFILES = {
    stream: streamServer,
    cast: castServer,
    watch: watchServer,
    plus: plusServer,
    casting: castingServer,
    player: playerServer,
    hub: hubServer,
};
export function serverProfile(server) {
    return SERVER_PROFILES[server];
}
