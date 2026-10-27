import { Menu, Plugin, TAbstractFile, TFolder, WorkspaceWindow, normalizePath } from "obsidian";
import { DynamicStyles, buildCss } from "./css";
import { CustomIcons } from "./custom-icons";
import { ExplorerDecorator } from "./explorer";
import { IconPickerModal } from "./icon-picker";
import { iconExists, kindOf } from "./kinds";
import { FolderStylesSettingTab } from "./settings-tab";
import {
	CUSTOM_PREFIX,
	DEFAULT_SETTINGS,
	FolderStylesSettings,
	ItemStyle,
	NO_ICON,
	cleanStyle,
	isEmptyStyle,
	moveItems,
	removeItems,
	sanitizeSettings,
} from "./settings-data";
import { StyleModal } from "./style-modal";

export default class FolderStylesPlugin extends Plugin {
	settings: FolderStylesSettings = { ...DEFAULT_SETTINGS };
	customIcons!: CustomIcons;
	private explorer = new ExplorerDecorator(this);
	private styles = new DynamicStyles();

	async onload(): Promise<void> {
		this.settings = sanitizeSettings(await this.loadData());
		const pluginDir = this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
		this.customIcons = new CustomIcons(this.app, normalizePath(`${pluginDir}/icons`));
		await this.customIcons.load();

		this.addSettingTab(new FolderStylesSettingTab(this.app, this));

		this.styles.attach(document);
		this.registerEvent(
			this.app.workspace.on("window-open", (win: WorkspaceWindow) => this.styles.attach(win.doc))
		);
		this.styles.set(buildCss(this.settings));

		this.app.workspace.onLayoutReady(() => {
			this.explorer.attachAll();
			this.registerEvent(this.app.workspace.on("layout-change", () => this.explorer.attachAll()));
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => this.addMenuItems(menu, [file]))
		);
		this.registerEvent(
			this.app.workspace.on("files-menu", (menu, files) => this.addMenuItems(menu, files))
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (moveItems(this.settings.items, oldPath, file.path)) void this.saveAndRefresh();
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (removeItems(this.settings.items, file.path)) void this.saveAndRefresh();
			})
		);
	}

	onunload(): void {
		this.explorer.detach();
		this.styles.detachAll();
	}

	async updateSettings(patch: Partial<FolderStylesSettings>): Promise<void> {
		this.settings = { ...this.settings, ...patch };
		await this.saveAndRefresh();
	}

	async saveAndRefresh(): Promise<void> {
		this.refresh();
		await this.saveData(this.settings);
	}

	refresh(): void {
		this.styles.set(buildCss(this.settings));
		this.explorer.renderAll();
	}

	/** Chave do ícone de um item (ver drawIcon em explorer.ts). */
	iconKey(path: string, folder: boolean): string {
		const chosen = this.settings.items[path]?.icon;
		if (chosen === NO_ICON) return "none";
		if (chosen?.startsWith(CUSTOM_PREFIX)) {
			if (this.customIcons.has(chosen.slice(CUSTOM_PREFIX.length))) return chosen;
		} else if (chosen && iconExists(chosen)) {
			return `icon:${chosen}`;
		}
		// Ícone escolhido sumiu (arquivo apagado, ícone fora desta versão): volta ao automático.
		if (!this.settings.autoIcons) return "none";
		return folder ? "folder" : `auto:${kindOf(path, false)}`;
	}

	/** Mescla `patch` no estilo de cada caminho; campos undefined são apagados. */
	async updateItems(paths: string[], patch: Partial<ItemStyle>): Promise<void> {
		const items = { ...this.settings.items };
		for (const path of paths) {
			const style = cleanStyle({ ...items[path], ...patch });
			if (isEmptyStyle(style)) delete items[path];
			else items[path] = style;
		}
		await this.updateSettings({ items });
	}

	/** Some com um ícone enviado e com as escolhas que o usavam. */
	async removeCustomIcon(name: string): Promise<void> {
		await this.customIcons.remove(name);
		const icon = `${CUSTOM_PREFIX}${name}`;
		const paths = Object.keys(this.settings.items).filter((path) => this.settings.items[path].icon === icon);
		if (paths.length) await this.updateItems(paths, { icon: undefined });
		else this.refresh();
	}

	private addMenuItems(menu: Menu, files: TAbstractFile[]): void {
		const targets = files.filter((file) => file.path !== "/" && file.path !== "");
		if (!targets.length) return;
		const paths = targets.map((file) => file.path);

		menu.addItem((item) =>
			item
				.setTitle("Change icon")
				.setIcon("image")
				.setSection("folder-styles")
				.onClick(() => this.openIconPicker(targets))
		);
		menu.addItem((item) =>
			item
				.setTitle("Edit style")
				.setIcon("palette")
				.setSection("folder-styles")
				.onClick(() => this.openStyleModal(targets))
		);
		if (paths.some((path) => this.settings.items[path])) {
			menu.addItem((item) =>
				item
					.setTitle("Reset icon and style")
					.setIcon("rotate-ccw")
					.setSection("folder-styles")
					.onClick(() => {
						const items = { ...this.settings.items };
						for (const path of paths) delete items[path];
						void this.updateSettings({ items });
					})
			);
		}
	}

	private describe(files: TAbstractFile[]): string {
		return files.length === 1 ? files[0].name : `${files.length} items`;
	}

	openIconPicker(files: TAbstractFile[]): void {
		const paths = files.map((file) => file.path);
		new IconPickerModal(
			this.app,
			this,
			`Icon: ${this.describe(files)}`,
			this.settings.items[paths[0]]?.icon,
			(icon) => void this.updateItems(paths, { icon })
		).open();
	}

	openStyleModal(files: TAbstractFile[]): void {
		const first = files[0];
		const folder = first instanceof TFolder;
		const paths = files.map((file) => file.path);
		new StyleModal(this.app, this, {
			heading: `Style: ${this.describe(files)}`,
			name: first.name,
			kind: kindOf(first.path, folder),
			iconKey: this.iconKey(first.path, folder),
			initial: this.settings.items[first.path] ?? {},
			// O ícone de cada item fica como está; só o estilo é trocado.
			onChange: (style) => {
				const items = { ...this.settings.items };
				for (const path of paths) {
					const next = cleanStyle({ ...style, icon: items[path]?.icon });
					if (isEmptyStyle(next)) delete items[path];
					else items[path] = next;
				}
				void this.updateSettings({ items });
			},
		}).open();
	}

	openDefaultsModal(type: "folder" | "file"): void {
		const folder = type === "folder";
		new StyleModal(this.app, this, {
			heading: folder ? "Style for all folders" : "Style for all files",
			name: folder ? "Folder" : "Note.md",
			kind: folder ? "folder" : "note",
			iconKey: this.settings.autoIcons ? (folder ? "folder" : "auto:note") : "none",
			initial: folder ? this.settings.folderDefaults : this.settings.fileDefaults,
			onChange: (style) =>
				void this.updateSettings(folder ? { folderDefaults: style } : { fileDefaults: style }),
		}).open();
	}
}
