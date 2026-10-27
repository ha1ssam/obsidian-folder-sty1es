/**
 * Janela "Change icon": todos os ícones do Obsidian com busca, uma aba com os
 * ícones enviados pelo usuário e as opções de voltar ao automático ou tirar
 * o ícone.
 */
import { App, Modal, Notice, getIconIds, setIcon } from "obsidian";
import { UploadError, chooseFiles, iconLabel } from "./custom-icons";
import type FolderStylesPlugin from "./main";
import { CUSTOM_PREFIX, NO_ICON } from "./settings-data";

/** Ícones desenhados por vez; "Show more" carrega o próximo lote. */
const PAGE = 160;

interface IconEntry {
	id: string;
	name: string;
	search: string;
}

const normalize = (text: string): string =>
	text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

let obsidianIcons: IconEntry[] | null = null;

/** Ícones do Obsidian sem repetição ("lucide-folder" e "folder" são o mesmo). */
function allObsidianIcons(): IconEntry[] {
	if (obsidianIcons) return obsidianIcons;
	const byName = new Map<string, IconEntry>();
	for (const id of getIconIds()) {
		const short = id.replace(/^lucide-/, "");
		const existing = byName.get(short);
		if (existing && !id.startsWith("lucide-")) continue;
		const name = short.replace(/-/g, " ");
		byName.set(short, { id, name, search: normalize(name) });
	}
	obsidianIcons = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
	return obsidianIcons;
}

type Tab = "obsidian" | "custom";

export class IconPickerModal extends Modal {
	private tab: Tab;
	private query = "";
	private limit = PAGE;
	private searchEl!: HTMLInputElement;
	private gridEl!: HTMLElement;
	private moreEl!: HTMLElement;
	private tabEls = new Map<Tab, HTMLElement>();

	constructor(
		app: App,
		private plugin: FolderStylesPlugin,
		private heading: string,
		/** Ícone atual (como salvo) ou undefined. */
		private current: string | undefined,
		private onChoose: (icon: string | undefined) => void
	) {
		super(app);
		this.tab = current?.startsWith(CUSTOM_PREFIX) ? "custom" : "obsidian";
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass("fs-modal", "fs-icon-modal");
		this.titleEl.setText(this.heading);

		const tabs = contentEl.createDiv({ cls: "fs-tabs", attr: { role: "tablist" } });
		for (const [tab, label] of [
			["obsidian", "Obsidian icons"],
			["custom", "Your icons"],
		] as const) {
			const el = tabs.createEl("button", { cls: "fs-tab", text: label, attr: { role: "tab" } });
			el.addEventListener("click", () => this.showTab(tab));
			this.tabEls.set(tab, el);
		}

		this.searchEl = contentEl.createEl("input", {
			cls: "fs-search",
			attr: { type: "search", placeholder: "Search icons…", spellcheck: "false", "aria-label": "Search icons" },
		});
		this.searchEl.addEventListener("input", () => {
			this.query = normalize(this.searchEl.value.trim());
			this.limit = PAGE;
			this.renderGrid();
		});
		this.searchEl.addEventListener("keydown", (evt) => {
			if (evt.key !== "Enter") return;
			const first = this.gridEl.querySelector<HTMLElement>(".fs-tile[data-value]");
			if (first) {
				evt.preventDefault();
				first.click();
			}
		});

		this.gridEl = contentEl.createDiv({ cls: "fs-icon-grid", attr: { role: "listbox" } });
		this.moreEl = contentEl.createDiv({ cls: "fs-more" });

		const footer = contentEl.createDiv({ cls: "fs-modal-footer" });
		const auto = footer.createEl("button", { text: "Automatic icon" });
		auto.addEventListener("click", () => this.choose(undefined));
		footer.createEl("button", { text: "No icon" }).addEventListener("click", () => this.choose(NO_ICON));

		this.showTab(this.tab);
		this.searchEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private choose(icon: string | undefined): void {
		this.close();
		this.onChoose(icon);
	}

	private showTab(tab: Tab): void {
		this.tab = tab;
		this.limit = PAGE;
		for (const [id, el] of this.tabEls) {
			el.toggleClass("is-active", id === tab);
			el.setAttribute("aria-selected", String(id === tab));
		}
		this.renderGrid();
	}

	private renderGrid(): void {
		this.gridEl.empty();
		this.moreEl.empty();
		if (this.tab === "custom") this.renderCustom();
		else this.renderObsidian();
	}

	private matches(search: string): boolean {
		return this.query.split(/\s+/).every((term) => search.includes(term));
	}

	private renderObsidian(): void {
		const found = allObsidianIcons().filter((icon) => this.matches(icon.search));
		for (const icon of found.slice(0, this.limit)) {
			const tile = this.tile(icon.id, icon.name);
			setIcon(tile, icon.id);
		}
		if (!found.length) {
			this.moreEl.setText("No icons match your search.");
		} else if (found.length > this.limit) {
			const more = this.moreEl.createEl("button", {
				text: `Show more (${found.length - this.limit} left)`,
			});
			more.addEventListener("click", () => {
				this.limit += PAGE;
				this.renderGrid();
			});
		}
	}

	private renderCustom(): void {
		const upload = this.gridEl.createEl("button", {
			cls: "fs-tile is-upload",
			attr: { "aria-label": "Upload icon" },
		});
		setIcon(upload, "upload");
		upload.addEventListener("click", () => void this.upload());

		const names = this.plugin.customIcons
			.list()
			.filter((name) => this.matches(normalize(iconLabel(name))));
		for (const name of names) {
			const tile = this.tile(`${CUSTOM_PREFIX}${name}`, iconLabel(name));
			tile.addClass("is-image");
			tile.createEl("img", { attr: { src: this.plugin.customIcons.url(name), alt: "" } });
		}
		if (!this.plugin.customIcons.list().length) {
			this.moreEl.setText("Upload SVG or PNG images (up to 512 KB each) to use them as icons.");
		} else if (!names.length) {
			this.moreEl.setText("No icons match your search.");
		}
	}

	private tile(value: string, label: string): HTMLElement {
		const selected = value === this.current;
		const tile = this.gridEl.createEl("button", {
			cls: ["fs-tile", ...(selected ? ["is-selected"] : [])],
			attr: { "data-value": value, "aria-label": label, role: "option", "aria-selected": String(selected) },
		});
		tile.addEventListener("click", () => this.choose(value));
		return tile;
	}

	private async upload(): Promise<void> {
		const files = await chooseFiles();
		if (!files.length) return;
		const added = await uploadIcons(this.plugin, files);
		// Um ícone só: já escolhe. Vários: mostra a aba para o usuário escolher.
		if (added.length === 1) this.choose(`${CUSTOM_PREFIX}${added[0]}`);
		else this.renderGrid();
	}
}

/** Envia os arquivos, avisa os erros e devolve os nomes salvos. */
export async function uploadIcons(plugin: FolderStylesPlugin, files: File[]): Promise<string[]> {
	const added: string[] = [];
	for (const file of files) {
		try {
			added.push(await plugin.customIcons.add(file));
		} catch (error) {
			new Notice(error instanceof UploadError ? error.message : `Could not save “${file.name}”.`);
		}
	}
	return added;
}
