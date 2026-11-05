// Substitutos mínimos da API do Obsidian, só para desenhar o explorador e as janelas fora do app.
// Os ícones vêm do Lucide (o mesmo conjunto do Obsidian), em .cache/icons.json (ver build.mjs).
import ICONS from "./.cache/icons.json";

const SVG: Record<string, string> = ICONS.svg;
const short = (id: string) => id.replace(/^lucide-/, "");

export function getIconIds(): string[] {
	return ICONS.names.map((name: string) => `lucide-${name}`);
}

function iconSvg(id: string): string | null {
	const name = short(id);
	const body = SVG[name];
	if (body == null) return null;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-${name}">${body}</svg>`;
}

export function getIcon(id: string): SVGSVGElement | null {
	const svg = iconSvg(id);
	if (!svg) return null;
	const wrap = document.createElement("div");
	wrap.innerHTML = svg;
	return wrap.firstElementChild as SVGSVGElement;
}

export function setIcon(el: HTMLElement, id: string): void {
	el.innerHTML = iconSvg(id) ?? "";
}

export const normalizePath = (p: string) => p.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
export const Platform = { isMobile: false, isPhone: false, isDesktop: true };

// ---------- Componentes ----------
export class ToggleComponent {
	toggleEl: HTMLElement;
	private handler?: (v: boolean) => unknown;
	constructor(parent: HTMLElement) {
		this.toggleEl = parent.createDiv({ cls: "checkbox-container" });
		this.toggleEl.createEl("input", { attr: { type: "checkbox", tabindex: "0" } });
	}
	setValue(on: boolean): this {
		this.toggleEl.toggleClass("is-enabled", on);
		return this;
	}
	onChange(fn: (v: boolean) => unknown): this {
		this.handler = fn;
		return this;
	}
}

export class DropdownComponent {
	selectEl: HTMLSelectElement;
	constructor(parent: HTMLElement) {
		this.selectEl = parent.createEl("select", { cls: "dropdown" }) as HTMLSelectElement;
	}
	addOptions(options: Record<string, string>): this {
		for (const [value, text] of Object.entries(options)) this.selectEl.createEl("option", { value, text });
		return this;
	}
	setValue(value: string): this {
		this.selectEl.value = value;
		return this;
	}
	onChange(): this {
		return this;
	}
}

export class ButtonComponent {
	buttonEl: HTMLButtonElement;
	constructor(parent: HTMLElement) {
		this.buttonEl = parent.createEl("button") as HTMLButtonElement;
	}
	setButtonText(text: string): this {
		this.buttonEl.textContent = text;
		return this;
	}
	setCta(): this {
		this.buttonEl.addClass("mod-cta");
		return this;
	}
	setWarning(): this {
		this.buttonEl.addClass("mod-warning");
		return this;
	}
	setDisabled(): this {
		return this;
	}
	onClick(): this {
		return this;
	}
}

export class Setting {
	settingEl: HTMLElement;
	infoEl: HTMLElement;
	nameEl: HTMLElement;
	descEl: HTMLElement;
	controlEl: HTMLElement;
	constructor(parent: HTMLElement) {
		this.settingEl = parent.createDiv({ cls: "setting-item" });
		this.infoEl = this.settingEl.createDiv({ cls: "setting-item-info" });
		this.nameEl = this.infoEl.createDiv({ cls: "setting-item-name" });
		this.descEl = this.infoEl.createDiv({ cls: "setting-item-description" });
		this.controlEl = this.settingEl.createDiv({ cls: "setting-item-control" });
	}
	setName(name: string): this {
		this.nameEl.textContent = name;
		return this;
	}
	setDesc(desc: string): this {
		this.descEl.textContent = desc;
		return this;
	}
	setHeading(): this {
		this.settingEl.addClass("setting-item-heading");
		return this;
	}
	addToggle(cb: (c: ToggleComponent) => unknown): this {
		cb(new ToggleComponent(this.controlEl));
		return this;
	}
	addDropdown(cb: (c: DropdownComponent) => unknown): this {
		cb(new DropdownComponent(this.controlEl));
		return this;
	}
	addButton(cb: (c: ButtonComponent) => unknown): this {
		cb(new ButtonComponent(this.controlEl));
		return this;
	}
}

// ---------- Janela ----------
export class Modal {
	/** A última janela aberta, para o harness achar. */
	static last: Modal | null = null;
	app: unknown;
	modalEl: HTMLElement;
	titleEl: HTMLElement;
	contentEl: HTMLElement;
	constructor(app: unknown) {
		this.app = app;
		this.modalEl = document.createElement("div");
		this.modalEl.className = "modal";
		const close = this.modalEl.createDiv({ cls: "modal-close-button" });
		setIcon(close, "x");
		this.titleEl = this.modalEl.createDiv({ cls: "modal-title" });
		this.contentEl = this.modalEl.createDiv({ cls: "modal-content" });
	}
	open(): void {
		Modal.last = this;
		document.body.appendChild(this.modalEl);
		(this as unknown as { onOpen?: () => void }).onOpen?.();
	}
	close(): void {}
}

// ---------- Menu do botão direito ----------
export class MenuItem {
	title = "";
	icon = "";
	section = "";
	setTitle(t: string): this {
		this.title = t;
		return this;
	}
	setIcon(i: string): this {
		this.icon = i;
		return this;
	}
	setSection(s: string): this {
		this.section = s;
		return this;
	}
	onClick(): this {
		return this;
	}
}
export class Menu {
	items: MenuItem[] = [];
	addItem(cb: (item: MenuItem) => unknown): this {
		const item = new MenuItem();
		cb(item);
		this.items.push(item);
		return this;
	}
}

// ---------- Plugin e arquivos ----------
export class Plugin {
	app: unknown;
	manifest: { id: string; dir?: string };
	constructor(app: unknown, manifest: { id: string; dir?: string }) {
		this.app = app;
		this.manifest = manifest;
	}
	async saveData(): Promise<void> {}
	async loadData(): Promise<unknown> {
		return null;
	}
}
export class TAbstractFile {
	path = "";
	name = "";
}
export class TFolder extends TAbstractFile {}
export class TFile extends TAbstractFile {}

class Dummy {}
export class Notice {}
export { Dummy as App, Dummy as PluginSettingTab };
export type SettingDefinitionItem = unknown;
export type WorkspaceWindow = { doc: Document };
