import { App, PluginSettingTab, Setting, SettingDefinitionItem, setIcon } from "obsidian";
import { chooseFiles, iconLabel } from "./custom-icons";
import { uploadIcons } from "./icon-picker";
import type FolderStylesPlugin from "./main";
import { FolderStylesSettings, isEmptyStyle } from "./settings-data";

type ToggleKey = "autoIcons" | "typeColors" | "hideBadges" | "inherit";

const TOGGLES: { key: ToggleKey; name: string; desc: string }[] = [
	{
		key: "autoIcons",
		name: "Automatic icons",
		desc: "Give every folder and file an icon based on its type. Icons you pick yourself always show.",
	},
	{
		key: "typeColors",
		name: "Colored icons",
		desc: "Color icons by type: PDFs red, images purple, canvases yellow and so on. Notes keep the theme color.",
	},
	{
		key: "hideBadges",
		name: "Hide extension labels",
		desc: "Hide the small PDF, PNG… label next to file names. The icon already shows the type.",
	},
	{
		key: "inherit",
		name: "Items inherit folder style",
		desc: "Everything inside a styled folder takes its colors and text style. A style set on an item itself always wins.",
	},
];

const DEFAULTS = {
	heading: "Default styles",
	folder: {
		name: "All folders",
		desc: "Colors and text style for every folder that has no style of its own.",
	},
	file: {
		name: "All files",
		desc: "Colors and text style for every file that has no style of its own.",
	},
};

const CUSTOM = {
	heading: "Your icons",
	uploadName: "Upload icons",
	uploadDesc:
		"SVG, PNG, JPG, WebP, GIF or AVIF, up to 512 KB each. They are saved in the plugin folder and show up in the “Your icons” tab when you change an icon.",
	listName: "Uploaded icons",
};

const RESET = { heading: "Reset", name: "Clear all icons and styles" };

const isToggleKey = (key: string): key is ToggleKey => TOGGLES.some((toggle) => toggle.key === key);

export class FolderStylesSettingTab extends PluginSettingTab {
	/** Botão "Clear all" esperando o segundo clique. */
	private confirmClear = false;

	constructor(
		app: App,
		private plugin: FolderStylesPlugin
	) {
		super(app, plugin);
	}

	/** Configurações declarativas (Obsidian 1.13+, aparecem na busca). */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			...TOGGLES.map((toggle) => ({
				name: toggle.name,
				desc: toggle.desc,
				control: { type: "toggle" as const, key: toggle.key },
			})),
			{
				type: "group",
				heading: DEFAULTS.heading,
				items: [
					{ ...DEFAULTS.folder, render: (setting) => this.renderDefaults(setting, "folder") },
					{ ...DEFAULTS.file, render: (setting) => this.renderDefaults(setting, "file") },
				],
			},
			{
				type: "group",
				heading: CUSTOM.heading,
				items: [
					{
						name: CUSTOM.uploadName,
						desc: CUSTOM.uploadDesc,
						render: (setting) => this.renderUpload(setting),
					},
					{
						name: CUSTOM.listName,
						searchable: false,
						visible: () => this.plugin.customIcons.list().length > 0,
						render: (setting) => this.renderIconList(setting),
					},
				],
			},
			{
				type: "group",
				heading: RESET.heading,
				items: [{ name: RESET.name, render: (setting) => this.renderClear(setting) }],
			},
		];
	}

	getControlValue(key: string): unknown {
		return isToggleKey(key) ? this.plugin.settings[key] : undefined;
	}

	setControlValue(key: string, value: unknown): Promise<void> {
		if (!isToggleKey(key)) return Promise.resolve();
		const patch: Partial<FolderStylesSettings> = { [key]: value === true };
		return this.plugin.updateSettings(patch);
	}

	/** Redesenha a tela depois de mudanças na estrutura (ícones enviados, limpar). */
	refresh(): void {
		// update() existe a partir do 1.13; antes disso, redesenha com display().
		const tab = this as unknown as { update?: () => void; display: () => void };
		if (typeof tab.update === "function") tab.update();
		else if (this.containerEl.isShown()) tab.display();
	}

	/** Fallback para versões do Obsidian anteriores à 1.13.0. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.confirmClear = false;

		for (const toggle of TOGGLES) {
			new Setting(containerEl)
				.setName(toggle.name)
				.setDesc(toggle.desc)
				.addToggle((component) =>
					component
						.setValue(this.plugin.settings[toggle.key])
						.onChange((value) => this.setControlValue(toggle.key, value))
				);
		}

		new Setting(containerEl).setName(DEFAULTS.heading).setHeading();
		this.renderDefaults(new Setting(containerEl).setName(DEFAULTS.folder.name).setDesc(DEFAULTS.folder.desc), "folder");
		this.renderDefaults(new Setting(containerEl).setName(DEFAULTS.file.name).setDesc(DEFAULTS.file.desc), "file");

		new Setting(containerEl).setName(CUSTOM.heading).setHeading();
		this.renderUpload(new Setting(containerEl).setName(CUSTOM.uploadName).setDesc(CUSTOM.uploadDesc));
		if (this.plugin.customIcons.list().length) {
			this.renderIconList(new Setting(containerEl).setName(CUSTOM.listName));
		}

		new Setting(containerEl).setName(RESET.heading).setHeading();
		this.renderClear(new Setting(containerEl).setName(RESET.name));
	}

	private renderDefaults(setting: Setting, type: "folder" | "file"): void {
		const style = type === "folder" ? this.plugin.settings.folderDefaults : this.plugin.settings.fileDefaults;
		setting
			.addButton((button) =>
				button.setButtonText("Edit").onClick(() => this.plugin.openDefaultsModal(type))
			)
			.addExtraButton((button) =>
				button
					.setIcon("rotate-ccw")
					.setTooltip("Reset")
					.setDisabled(isEmptyStyle(style))
					.onClick(() => {
						void this.plugin
							.updateSettings(type === "folder" ? { folderDefaults: {} } : { fileDefaults: {} })
							.then(() => this.refresh());
					})
			);
	}

	private renderUpload(setting: Setting): void {
		setting.addButton((button) =>
			button.setButtonText("Upload").onClick(async () => {
				const files = await chooseFiles();
				if (!files.length) return;
				await uploadIcons(this.plugin, files);
				this.refresh();
			})
		);
	}

	/** Grade com os ícones enviados, cada um com botão de apagar. */
	private renderIconList(setting: Setting): void {
		setting.settingEl.addClass("fs-custom-setting");
		const grid = setting.settingEl.createDiv({ cls: "fs-custom-list" });
		for (const name of this.plugin.customIcons.list()) {
			const card = grid.createDiv({ cls: "fs-custom-card" });
			card.createEl("img", { attr: { src: this.plugin.customIcons.url(name), alt: "" } });
			card.createDiv({ cls: "fs-custom-name", text: iconLabel(name) });
			// O Obsidian mostra o aria-label como dica ao passar o mouse.
			const remove = card.createEl("button", {
				cls: "fs-custom-remove clickable-icon",
				attr: { "aria-label": `Delete ${iconLabel(name)}` },
			});
			setIcon(remove, "x");
			remove.addEventListener("click", () => {
				void this.plugin.removeCustomIcon(name).then(() => this.refresh());
			});
		}
	}

	private renderClear(setting: Setting): void {
		const count = Object.keys(this.plugin.settings.items).length;
		setting.setDesc(
			count
				? `Remove the icons and styles picked for ${count} ${count === 1 ? "item" : "items"}. Uploaded icons and default styles stay.`
				: "No items have their own icon or style yet."
		);
		this.confirmClear = false;
		setting.addButton((button) => {
			button.setButtonText("Clear all").setDisabled(!count);
			button.onClick(() => {
				if (!this.confirmClear) {
					this.confirmClear = true;
					button.setButtonText("Click again to confirm").setWarning();
					return;
				}
				void this.plugin.updateSettings({ items: {} }).then(() => this.refresh());
			});
		});
	}
}
