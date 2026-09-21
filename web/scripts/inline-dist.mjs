import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const dist = new URL("../dist/", import.meta.url);
const indexUrl = new URL("index.html", dist);
let html = await readFile(indexUrl, "utf8");

const scriptMatch = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!scriptMatch) throw new Error("Vite module script was not found in dist/index.html.");

const scriptPath = resolve(dist.pathname, scriptMatch[1].replace(/^\.\//, ""));
let js = await readFile(scriptPath, "utf8");
js = js.replace(/<\/script/gi, "<\\/script");
html = html.replace(scriptMatch[0], `<script type="module">\n${js}\n</script>`);

const styleMatch = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!styleMatch) throw new Error("Vite stylesheet was not found in dist/index.html.");

const stylePath = resolve(dist.pathname, styleMatch[1].replace(/^\.\//, ""));
let css = await readFile(stylePath, "utf8");
css = css.replace(/<\/style/gi, "<\\/style");
html = html.replace(styleMatch[0], `<style>\n${css}\n</style>`);

await writeFile(indexUrl, html, "utf8");
await rm(new URL("assets/", dist), { recursive: true, force: true });
