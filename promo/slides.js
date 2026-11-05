// Monta cada imagem de divulgação. Ver promo/README.md.
const P = window.Promo;
const params = new URLSearchParams(location.search);
const FORMAT = params.get("f") || "portrait";
const SLIDE = params.get("s") || "explorer";
const L = FORMAT === "landscape";

const h = (tag, attrs = {}, ...kids) => {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (k === "class") el.className = v;
		else if (k === "style") el.style.cssText = v;
		else if (k === "html") el.innerHTML = v;
		else el.setAttribute(k, v);
	}
	for (const kid of kids.flat()) if (kid != null) el.append(kid);
	return el;
};
/** A pasta com o "1" do ícone do plugin. */
const folderLogo = (cls, fill, ink) => h("span", { class: cls, html:
	`<svg viewBox="16 40 480 440" width="100%" height="100%"><path d="M16 120Q16 40 96 40H190Q225 40 245 70L258 88Q270 105 300 105H416Q496 105 496 185V400Q496 480 416 480H96Q16 480 16 400Z" fill="${fill}"/>` +
	`<text x="256" y="402" text-anchor="middle" font-family="JetBrains Mono" font-weight="800" font-size="300" fill="${ink}">1</text></svg>` });
const brand = () => h("div", { class: "brand" }, folderLogo("logo", "#8b6cef", "#161616"),
	h("span", { html: 'Folder Sty<span class="one">1</span>es' }));

function frame(eyebrow, title, sub, stage) {
	const slide = h("div", { class: `slide ${FORMAT}` });
	const text = [h("p", { class: "eyebrow" }, eyebrow), h("h1", { html: title }), sub ? h("p", { class: "sub", html: sub }) : null];
	const t = text.filter(Boolean);
	if (L) slide.append(h("div", { class: "left" }, ...t, brand()), h("div", { class: "stage" }, stage));
	else slide.append(...t, h("div", { class: "stage" }, stage), brand());
	document.body.append(slide);
	return slide;
}

/** Corta a grade de ícones em `rows` linhas inteiras (ela rola no app). */
function clipRows(modal, rows) {
	const grid = modal.querySelector(".fs-icon-grid");
	const tile = grid.querySelector(".fs-tile").getBoundingClientRect().height;
	grid.style.maxHeight = `${rows * (tile + 4) - 4 + 4}px`;
	grid.style.overflow = "hidden";
}

/** Painel com o explorador real (ícones e estilos do plugin). */
function explorerPanel(spec, style = "") {
	const panel = h("div", { class: "explorer", style });
	P.explorer(panel, spec);
	return panel;
}

const SLIDES = {
	explorer() {
		P.configure({});
		const tree = explorerPanel({
			tree: [
				["Projects", [
					["Launch", ["Roadmap.md", "Board.canvas", "Tasks.base", "Brief.pdf"]],
					["Media", ["cover.png", "theme.mp3", "trailer.mp4"]],
					"script.js", "budget.csv", "backup.zip", "notes.txt",
				]],
				["Archive", null],
			],
		}, `zoom:${L ? 1.08 : 1.1};width:${L ? 270 : 360}px;flex:none`);
		const info = h("div", { style: "display:flex;flex-direction:column;" + (L ? "width:140px;flex:none" : "") },
			folderLogo("logo1", "#161616", "#8b6cef"),
			h("div", { style: L ? "margin-top:auto" : "" },
				h("div", { class: "kicker" }, "Obsidian plugin"),
				h("div", { class: "title", html: "Folder<br>Sty1es" }),
				h("div", { class: "text" }, "An icon for every folder and file, colored by type.")),
			L ? h("div", { class: "foot", style: "margin-top:auto" }, "Desktop,", h("br"), "phones", h("br"), "and tablets") : null);
		const hero = h("div", { class: "hero", style: L ? "height:500px;align-items:stretch;width:100%;padding:24px;gap:18px" : "flex-direction:column;align-items:stretch;gap:18px" }, info,
			h("div", { style: "display:flex;justify-content:center;align-items:center;flex:1" }, tree));
		if (!L) Object.assign(info.style, { flexDirection: "row", gap: "16px", alignItems: "flex-start" });
		frame("File explorer", "Every file gets its own&nbsp;icon.", null, hero);
	},
	icons() {
		P.configure({ items: { Projects: { icon: "lucide-folder-kanban" } } });
		const menu = h("div", { style: "flex:none" });
		P.contextMenu(menu, "Projects");
		const tree = explorerPanel({ tree: [["Projects", null], ["Archive", null], "Ideas.md"], active: "Projects" },
			`zoom:${L ? 1 : 1.1};width:${L ? 200 : 180}px;flex:none;align-self:flex-start`);
		const modal = h("div", { style: L ? "width:340px;flex:none" : "width:100%" });
		P.iconPicker(modal, { path: "Projects", folder: true, query: "folder" });
		let stage;
		if (L) {
			const left = h("div", { style: "display:flex;flex-direction:column;gap:10px;flex:none;width:200px" }, tree, menu);
			stage = h("div", { style: "display:flex;gap:16px;align-items:center" }, left, modal);
			menu.style.cssText += ";margin-left:40px;position:relative;z-index:1";
		} else {
			stage = h("div", { style: "display:flex;flex-direction:column;gap:16px" },
				h("div", { style: "display:flex;gap:14px;align-items:flex-start" }, tree, menu), modal);
		}
		frame("Change icon", "Right-click. Pick any&nbsp;icon.",
			"Every icon that ships with Obsidian, with search. Select several items to change them all at once.", stage);
		clipRows(modal, L ? 4 : 3);
	},
	uploads() {
		const C = (name) => ({ icon: `custom:${name}.svg` });
		P.configure({ items: {
			Astronomy: C("planet"), "Astronomy/Moon phases.md": C("moon"), "Astronomy/Sunspots.md": C("sun"),
			Garden: C("leaf"), Recipes: C("coffee"), Team: C("avatar"), "Favorites.md": C("heart"), "Ideas.md": C("bolt"),
		} });
		const tree = explorerPanel({
			tree: [["Astronomy", ["Moon phases.md", "Sunspots.md"]], ["Garden", null], ["Recipes", null], ["Team", null], "Favorites.md", "Ideas.md"],
			active: "Astronomy",
		}, `zoom:${L ? 1.05 : 1.15};width:${L ? 190 : "auto"};flex:none`);
		const modal = h("div", { style: L ? "width:330px;flex:none" : "width:100%" });
		P.iconPicker(modal, { path: "Astronomy", folder: true, tab: "custom" });
		const stage = h("div", { style: `display:flex;gap:16px;${L ? "align-items:center" : "flex-direction:column"}` }, tree, modal);
		frame("Your icons", "Use your own&nbsp;images.",
			"Upload SVG, PNG, WebP or GIF: logos, avatars, emoji. They keep their colors and live in the plugin folder, not among your notes.", stage);
	},
	style() {
		P.configure({
			inherit: true,
			items: {
				Design: { iconColor: "pink", textColor: "pink", background: "pink", bold: true },
				"Launch plan.md": { icon: "lucide-rocket", iconColor: "green", textColor: "green", bold: true },
				"Ideas.md": { icon: "lucide-star", iconColor: "yellow", italic: true },
				Archive: { textColor: "gray", italic: true, size: "small" },
			},
		});
		const tree = explorerPanel({
			tree: [["Design", [["Brand", null], "cover.png", "Board.canvas"]], "Launch plan.md", "Ideas.md", ["Archive", null]],
		}, `zoom:${L ? 1.05 : 1.1};width:${L ? 200 : "auto"};flex:none`);
		// A janela inteira é alta: no horizontal ela encolhe, no vertical some aos poucos embaixo.
		const modal = h("div", { style: L ? "width:440px;zoom:.68;flex:none" : "width:530px;zoom:.853" });
		P.styleModal(modal, "Design");
		const wrap = h("div", { style: L ? "flex:none" : "overflow:hidden;-webkit-mask-image:linear-gradient(to bottom,#000 78%,transparent)" }, modal);
		const stage = h("div", { style: `display:flex;gap:16px;${L ? "align-items:center" : "flex-direction:column"}` }, tree, wrap);
		const slide = frame("Edit style", "Colors and text style for any&nbsp;item.",
			"Icon, name and background colors, bold, italic and size. Folders can pass their style to everything inside.", stage);
		if (!L) wrap.style.height = `${slide.getBoundingClientRect().bottom - 110 - wrap.getBoundingClientRect().top}px`;
	},
};
SLIDES[SLIDE]();
document.body.dataset.ready = "1";
