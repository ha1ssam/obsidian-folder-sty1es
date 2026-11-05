// Expõe o explorador, as janelas e o menu reais do plugin para as imagens de divulgação.
import { Menu, Modal, TFile, TFolder, setIcon } from "obsidian";
import { buildCss } from "../src/css";
import { ExplorerDecorator } from "../src/explorer";
import FolderStylesPlugin from "../src/main";
import { DEFAULT_SETTINGS, FolderStylesSettings, ItemStyle } from "../src/settings-data";

// ---------- Ajudantes de DOM do Obsidian ----------
type Info = { cls?: string | string[]; text?: string; type?: string; placeholder?: string; value?: string; attr?: Record<string, string | number | boolean> } | string;
const P = HTMLElement.prototype as any;
function apply(el: HTMLElement, o?: Info) {
	if (!o) return;
	if (typeof o === "string") { el.className = o; return; }
	if (o.cls) el.classList.add(...([] as string[]).concat(o.cls).flatMap((c) => c.split(" ")).filter(Boolean));
	if (o.text != null) el.textContent = o.text;
	if (o.type) el.setAttribute("type", o.type);
	if (o.placeholder) el.setAttribute("placeholder", o.placeholder);
	if (o.value != null) (el as HTMLInputElement).value = o.value;
	if (o.attr) for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, String(v));
}
const make = (doc: Document, tag: string, o?: Info, cb?: (el: HTMLElement) => void) => {
	const el = doc.createElement(tag); apply(el, o); cb?.(el); return el;
};
P.createEl = function (tag: string, o?: Info, cb?: any) { const el = make(this.ownerDocument, tag, o, cb); this.appendChild(el); return el; };
P.createDiv = function (o?: Info, cb?: any) { return this.createEl("div", o, cb); };
P.createSpan = function (o?: Info, cb?: any) { return this.createEl("span", o, cb); };
P.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
P.setText = function (t: string) { this.textContent = t; };
P.addClass = function (...c: string[]) { this.classList.add(...c); };
P.removeClass = function (...c: string[]) { this.classList.remove(...c); };
P.toggleClass = function (c: string, v: boolean) { this.classList.toggle(c, v); };
P.hasClass = function (c: string) { return this.classList.contains(c); };
P.isShown = function () { return this.style.display !== "none"; };
P.setCssProps = function (props: Record<string, string>) {
	for (const [k, v] of Object.entries(props)) v ? this.style.setProperty(k, v) : this.style.removeProperty(k);
};
const W = window as any;
W.createEl = (tag: string, o?: Info, cb?: any) => make(document, tag, o, cb);
W.createDiv = (o?: Info, cb?: any) => make(document, "div", o, cb);
W.createSpan = (o?: Info, cb?: any) => make(document, "span", o, cb);

// ---------- Ícones enviados (imagens fictícias) ----------
const svg = (body: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`)}`;
const UPLOADS: Record<string, string> = {
	"planet.svg": svg('<g fill="none" stroke="#f5c542" stroke-width="5" transform="rotate(-18 32 32)"><path d="M3 32A29 9 0 0 1 61 32"/></g><circle cx="32" cy="32" r="17" fill="#8b6cef"/><g fill="none" stroke="#f5c542" stroke-width="5" transform="rotate(-18 32 32)"><path d="M3 32A29 9 0 0 0 61 32"/></g>'),
	"sun.svg": svg('<g stroke="#ffb020" stroke-width="5" stroke-linecap="round"><path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M12 52l6-6M46 18l6-6"/></g><circle cx="32" cy="32" r="13" fill="#ffb020"/>'),
	"leaf.svg": svg('<path d="M10 54 C10 24 26 8 56 8 C56 38 40 54 10 54 Z" fill="#3fbf6a"/><path d="M14 50 L44 20" stroke="#1d7a3c" stroke-width="4" stroke-linecap="round"/>'),
	"flame.svg": svg('<path d="M32 4 C36 18 50 24 50 40 A18 18 0 0 1 14 40 C14 30 20 24 24 18 C26 26 30 28 32 28 C30 20 30 12 32 4 Z" fill="#ff6a3d"/><path d="M32 30 C36 38 42 40 42 47 A10 10 0 0 1 22 47 C22 41 28 38 32 30 Z" fill="#ffc94a"/>'),
	"heart.svg": svg('<path d="M32 56 C8 40 4 28 8 18 C12 8 26 6 32 18 C38 6 52 8 56 18 C60 28 56 40 32 56 Z" fill="#ff4d6d"/>'),
	"gem.svg": svg('<path d="M18 8h28l12 16-26 34L6 24Z" fill="#3fc7e8"/><path d="M6 24h52M18 8l6 16 8 34 8-34 6-16" fill="none" stroke="#bff1fb" stroke-width="2.5" stroke-linejoin="round"/>'),
	"coffee.svg": svg('<path d="M8 24h38v18a14 14 0 0 1-14 14H22A14 14 0 0 1 8 42Z" fill="#c98a5a"/><path d="M46 28h4a7 7 0 0 1 0 14h-4" fill="none" stroke="#c98a5a" stroke-width="5"/><g stroke="#9a9a9a" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M20 6c-3 4 3 8 0 12M30 6c-3 4 3 8 0 12"/></g>'),
	"moon.svg": svg('<path d="M40 6 A26 26 0 1 0 58 42 A20 20 0 1 1 40 6 Z" fill="#ffd166"/>'),
	"cherries.svg": svg('<path d="M20 40 C22 26 30 14 46 6 M44 42 C44 28 44 16 46 6" stroke="#3fbf6a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="19" cy="44" r="12" fill="#e63946"/><circle cx="45" cy="46" r="12" fill="#e63946"/>'),
	"cloud.svg": svg('<path d="M18 50 A12 12 0 0 1 16 26 A16 16 0 0 1 46 22 A14 14 0 0 1 48 50 Z" fill="#9ecbff"/>'),
	"book.svg": svg('<rect x="12" y="6" width="40" height="52" rx="5" fill="#4c8dff"/><rect x="12" y="46" width="40" height="12" rx="4" fill="#dbe7ff"/><rect x="20" y="16" width="24" height="6" rx="3" fill="#dbe7ff"/>'),
	"star.svg": svg('<path d="M32 4l8.6 17.5 19.4 2.8-14 13.6 3.3 19.3L32 48.1 14.7 57.2 18 37.9 4 24.3l19.4-2.8Z" fill="#ffd43b"/>'),
	"avatar.svg": svg('<circle cx="32" cy="32" r="30" fill="#fa99cd"/><circle cx="32" cy="26" r="11" fill="#7a2453"/><path d="M12 52 A22 18 0 0 1 52 52 A30 30 0 0 1 12 52 Z" fill="#7a2453"/>'),
	"bolt.svg": svg('<path d="M36 4 12 36h18l-4 24 26-34H34Z" fill="#53dfdd"/>'),
};
const customIcons = {
	has: (name: string) => name in UPLOADS,
	list: () => Object.keys(UPLOADS),
	url: (name: string) => UPLOADS[name],
};

// ---------- O plugin, com configurações escolhidas por imagem ----------
const app: any = { workspace: { getLeavesOfType: () => leaves } };
let leaves: { view: { containerEl: HTMLElement } }[] = [];
const plugin = new FolderStylesPlugin(app, { id: "folder-styles" } as any);
plugin.customIcons = customIcons as any;
const styleEl = document.createElement("style");
document.head.appendChild(styleEl);

function configure(patch: Partial<FolderStylesSettings>) {
	plugin.settings = { ...DEFAULT_SETTINGS, ...patch };
	styleEl.textContent = buildCss(plugin.settings);
}

// ---------- Explorador de arquivos ----------
/** Pasta: [nome, filhos] (filhos null = fechada). Arquivo: nome. */
type Node = string | [string, Node[] | null];
export interface ExplorerSpec {
	tree: Node[];
	/** Caminho com destaque (item aberto ou clicado). */
	active?: string;
}
const ext = (name: string) => (name.lastIndexOf(".") > 0 ? name.slice(name.lastIndexOf(".") + 1) : "");
function explorer(target: HTMLElement, spec: ExplorerSpec) {
	const leaf = target.createDiv({ cls: "workspace-leaf-content", attr: { "data-type": "file-explorer" } });
	const files = leaf.createDiv({ cls: "nav-files-container" });
	const add = (parent: HTMLElement, nodes: Node[], base: string) => {
		for (const node of nodes) {
			const folder = Array.isArray(node);
			const name = folder ? node[0] : node;
			const path = base + name;
			const item = parent.createDiv({ cls: `tree-item ${folder ? "nav-folder" : "nav-file"}` });
			const self = item.createDiv({ cls: `tree-item-self is-clickable ${folder ? "nav-folder-title mod-collapsible" : "nav-file-title"}`, attr: { "data-path": path } });
			if (path === spec.active) self.addClass("is-active");
			if (folder) {
				const open = node[1] !== null;
				if (!open) item.addClass("is-collapsed");
				const arrow = self.createDiv({ cls: "tree-item-icon collapse-icon" + (open ? "" : " is-collapsed") });
				setIcon(arrow, "chevron-down");
				self.createDiv({ cls: "tree-item-inner nav-folder-title-content", text: name });
				if (open) add(item.createDiv({ cls: "tree-item-children nav-folder-children" }), node[1]!, path + "/");
			} else {
				const e = ext(name);
				self.createDiv({ cls: "tree-item-inner nav-file-title-content", text: e ? name.slice(0, -e.length - 1) : name });
				if (e && e !== "md") self.createDiv({ cls: "nav-file-tag", text: e });
			}
		}
	};
	add(files, spec.tree, "");
	leaves.push({ view: { containerEl: leaf } });
	new ExplorerDecorator(plugin).attachAll();
	return leaf;
}

// ---------- Menu do botão direito (itens do plugin entre os do Obsidian) ----------
function contextMenu(target: HTMLElement, path: string) {
	const menu = new Menu() as any;
	(plugin as any).addMenuItems(menu, [Object.assign(new TFolder(), { path, name: path })]);
	const el = target.createDiv({ cls: "menu" });
	const row = (icon: string, title: string, cls = "") => {
		const item = el.createDiv({ cls: "menu-item " + cls });
		setIcon(item.createDiv({ cls: "menu-item-icon" }), icon);
		item.createDiv({ cls: "menu-item-title", text: title });
		return item;
	};
	row("file-plus", "New note");
	el.createDiv({ cls: "menu-separator" });
	menu.items.forEach((it: any, i: number) => row(it.icon, it.title, i === 0 ? "selected" : ""));
	el.createDiv({ cls: "menu-separator" });
	row("trash-2", "Delete", "is-warning");
	return el;
}

// ---------- Janelas ----------
function adopt(target: HTMLElement) {
	const el = Modal.last!.modalEl;
	(document.activeElement as HTMLElement | null)?.blur();
	target.appendChild(el);
	return el;
}
export interface PickerSpec {
	path: string;
	folder?: boolean;
	tab?: "obsidian" | "custom";
	query?: string;
}
function iconPicker(target: HTMLElement, spec: PickerSpec) {
	const file = Object.assign(spec.folder ? new TFolder() : new TFile(), { path: spec.path, name: spec.path.split("/").pop() });
	plugin.openIconPicker([file]);
	const el = adopt(target);
	if (spec.tab === "custom") el.querySelectorAll<HTMLElement>(".fs-tab")[1].click();
	if (spec.query) {
		const input = el.querySelector<HTMLInputElement>(".fs-search")!;
		input.value = spec.query;
		input.dispatchEvent(new Event("input"));
	}
	return el;
}
function styleModal(target: HTMLElement, path: string, folder = true) {
	const file = Object.assign(folder ? new TFolder() : new TFile(), { path, name: path.split("/").pop() });
	plugin.openStyleModal([file]);
	return adopt(target);
}

(window as any).Promo = { configure, explorer, contextMenu, iconPicker, styleModal, uploads: Object.keys(UPLOADS) };
export type { ItemStyle };
