/**
 * Põe os ícones nas linhas do explorador de arquivos.
 *
 * O Obsidian cria e recria as linhas sozinho (abrir pasta, rolar, renomear),
 * então um MutationObserver em cada painel do explorador decora cada linha que
 * aparece. Cada ícone guarda uma chave (`data-fs-key`); a linha só é
 * redesenhada quando a chave muda.
 */
import { setIcon } from "obsidian";
import { FOLDER_OPEN_ICONS, Kind, firstIcon, kindIcon, kindOf } from "./kinds";
import type FolderStylesPlugin from "./main";
import { CUSTOM_PREFIX } from "./settings-data";

const TITLE_SELECTOR = ".nav-file-title, .nav-folder-title";
const CONTENT_SELECTOR = ":scope > .nav-file-title-content, :scope > .nav-folder-title-content";

/**
 * Chaves de ícone:
 * - `none` — sem ícone;
 * - `folder` — pasta automática (fechada/aberta);
 * - `auto:<tipo>` — ícone automático do tipo;
 * - `icon:<id>` — ícone do Obsidian escolhido;
 * - `custom:<arquivo>` — ícone enviado pelo usuário.
 */
export function drawIcon(el: HTMLElement, key: string, kind: Kind, plugin: FolderStylesPlugin): void {
	el.setAttribute("data-fs-kind", kind);
	if (el.getAttribute("data-fs-key") === key) return;
	el.empty();
	el.setAttribute("data-fs-key", key);
	el.toggleClass("is-image", key.startsWith(CUSTOM_PREFIX));

	if (key === "folder") {
		setIcon(el.createSpan({ cls: "fs-closed" }), kindIcon("folder"));
		setIcon(el.createSpan({ cls: "fs-open" }), firstIcon(FOLDER_OPEN_ICONS));
	} else if (key.startsWith("auto:")) {
		setIcon(el, kindIcon(kind));
	} else if (key.startsWith("icon:")) {
		setIcon(el, key.slice("icon:".length));
	} else if (key.startsWith(CUSTOM_PREFIX)) {
		el.createEl("img", {
			attr: {
				src: plugin.customIcons.url(key.slice(CUSTOM_PREFIX.length)),
				alt: "",
				draggable: "false",
			},
		});
	}
}

export class ExplorerDecorator {
	private observers = new Map<HTMLElement, MutationObserver>();

	constructor(private plugin: FolderStylesPlugin) {}

	/** Começa a observar os painéis do explorador ainda não observados. */
	attachAll(): void {
		for (const [el, observer] of this.observers) {
			if (!el.isConnected) {
				observer.disconnect();
				this.observers.delete(el);
			}
		}
		for (const leaf of this.plugin.app.workspace.getLeavesOfType("file-explorer")) {
			const el = leaf.view.containerEl;
			if (this.observers.has(el)) continue;
			const observer = new MutationObserver((records) => this.onMutations(records));
			observer.observe(el, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["data-path"],
			});
			this.observers.set(el, observer);
			this.renderWithin(el);
		}
	}

	/** Redesenha tudo (depois de mudar as configurações). */
	renderAll(): void {
		for (const el of this.observers.keys()) this.renderWithin(el);
	}

	detach(): void {
		for (const [el, observer] of this.observers) {
			observer.disconnect();
			el.querySelectorAll(".fs-icon").forEach((icon) => icon.remove());
		}
		this.observers.clear();
	}

	private onMutations(records: MutationRecord[]): void {
		for (const record of records) {
			if (record.type === "attributes") {
				this.render(record.target as Element);
				continue;
			}
			record.addedNodes.forEach((node) => {
				if (node.nodeType !== Node.ELEMENT_NODE) return;
				const el = node as Element;
				if (el.matches(TITLE_SELECTOR)) this.render(el);
				else this.renderWithin(el);
			});
		}
	}

	private renderWithin(root: Element): void {
		root.querySelectorAll(TITLE_SELECTOR).forEach((title) => this.render(title));
	}

	private render(title: Element): void {
		const path = title.getAttribute("data-path");
		if (!path || path === "/") return;
		const folder = title.classList.contains("nav-folder-title");
		const key = this.plugin.iconKey(path, folder);

		let icon = title.querySelector<HTMLElement>(":scope > .fs-icon");
		if (key === "none") {
			icon?.remove();
			return;
		}
		if (!icon) {
			icon = createSpan({ cls: "fs-icon", attr: { "aria-hidden": "true" } });
			title.insertBefore(icon, title.querySelector(CONTENT_SELECTOR));
		}
		drawIcon(icon, key, kindOf(path, folder), this.plugin);
	}
}
