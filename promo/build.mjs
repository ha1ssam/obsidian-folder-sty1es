// Gera as imagens de divulgação em promo/images (ver promo/README.md).
// Uso: node promo/build.mjs [slide...]
import esbuild from "esbuild";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// require (e não import) também acha um Playwright instalado globalmente.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, ".cache");
const SLIDES = ["explorer", "icons", "uploads", "style"];
const FORMATS = {
	portrait: { width: 540, height: 960 },
	landscape: { width: 900, height: 600 },
};

// Ícones do Lucide (o conjunto que o Obsidian usa) para o setIcon/getIconIds de mentira.
const lucide = dirname(require.resolve("lucide-static/package.json"));
const svg = {};
for (const file of readdirSync(join(lucide, "icons"))) {
	if (!file.endsWith(".svg")) continue;
	const text = readFileSync(join(lucide, "icons", file), "utf8");
	svg[file.slice(0, -4)] = text.slice(text.indexOf(">", text.indexOf("<svg")) + 1, text.lastIndexOf("</svg>")).replace(/\s*\n\s*/g, "");
}
// Só os nomes principais vão para a janela de ícones (sem os apelidos antigos).
const names = Object.keys(JSON.parse(readFileSync(join(lucide, "icon-nodes.json"), "utf8")));
mkdirSync(cache, { recursive: true });
writeFileSync(join(cache, "icons.json"), JSON.stringify({ names, svg }));

// O código real do plugin, com a API do Obsidian trocada por substitutos.
await esbuild.build({
	entryPoints: [join(here, "harness.ts")],
	bundle: true,
	format: "iife",
	alias: { obsidian: join(here, "obsidian-stub.ts") },
	outfile: join(cache, "harness.js"),
	logLevel: "warning",
});

const only = process.argv.slice(2);
const slides = only.length ? only : SLIDES;
const out = join(here, "images");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [format, viewport] of Object.entries(FORMATS)) {
	// 2x: 1080×1920 (vertical) e 1800×1200 (horizontal).
	const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
	page.on("pageerror", (err) => console.error(format, err.message));
	for (const slide of slides) {
		const url = pathToFileURL(join(here, "page.html"));
		url.search = `?s=${slide}&f=${format}`;
		await page.goto(url.href);
		await page.waitForSelector("body[data-ready]");
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(250);
		const file = `${SLIDES.indexOf(slide) + 1}-${slide}-${format}.png`;
		await page.screenshot({ path: join(out, file) });
		console.log(file);
	}
	await page.close();
}
await browser.close();
