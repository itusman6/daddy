import { extractPlayableFromHtml, extractAsyncPlayable } from "./extractors/embed.js";
export async function resolveFromHtml(embedHtml, ctx) {
    const resolved = extractPlayableFromHtml(embedHtml);
    if (resolved) {
        return { ...ctx, ...resolved };
    }
    const asyncResolved = await extractAsyncPlayable(embedHtml, ctx.embedUrl);
    if (asyncResolved) {
        return { ...ctx, ...asyncResolved };
    }
    throw new Error(`no playable stream in ${ctx.server} embed`);
}
