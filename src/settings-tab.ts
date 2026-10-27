import { App, PluginSettingTab, Setting, setIcon, setTooltip } from "obsidian";
import { chooseFiles, iconLabel } from "./custom-icons";
import { uploadIcons } from "./icon-picker";
import type FolderStylesPlugin from "./main";
import { isEmptyStyle } from "./settings-data";

export class FolderStylesSettingTab extends PluginSettingTab {
	/** Botão "Clear all" esperando o segundo clique. */
	private confirmClear = false;

	constructor(
		app: App,
		private plugin: FolderStylesPlugin
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		const { settings } = this.plugin;
		containerEl.empty();
		this.confirmClear = false;

		new Setting(containerEl)
			.setName("Automatic icons")
			.setDesc("Give every folder and file an icon based on its type. Icons you pick yourself always show.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.autoIcons)
					.onChange((value) => this.plugin.updateSettings({ autoIcons: value }))
			);
		new Setting(containerEl)
			.setName("Colored icons")
			.setDesc("Color icons by type: PDFs red, images purple, canvases yellow and so on. Notes keep the theme color.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.typeColors)
					.onChange((value) => this.plugin.updateSettings({ typeColors: value }))
			);
		new Setting(containerEl)
			.setName("Hide extension labels")
			.setDesc("Hide the small PDF, PNG… label next to file names. The icon already shows the type.")
			.addToggle((toggle) =>
				toggle
					.setValue(settings.hideBadges)
					.onChange((value) => this.plugin.updateSettings({ hideBadges: value }))
			);
		new Setting(containerEl)
			.setName("Items inherit folder style")
			.setDesc(
				"Everything inside a styled folder takes its colors and text style. A style set on an item itself always wins."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(settings.inherit)
					.onChange((value) => this.plugin.updateSettings({ inherit: value }))
			);

		new Setting(containerEl).setName("Default styles").setHeading();
		this.defaultsSetting("All folders", "folder");
		this.defaultsSetting("All files", "file");

		this.renderCustomIcons(containerEl);

		new Setting(containerEl).setName("Reset").setHeading();
		const count = Object.keys(settings.items).length;
		new Setting(containerEl)
			.setName("Clear all icons and styles")
			.setDesc(
				count
					? `Remove the icons and styles picked for ${count} ${count === 1 ? "item" : "items"}. Uploaded icons and default styles stay.`
					: "No items have their own icon or style yet."
			)
			.addButton((button) => {
				button.setButtonText("Clear all").setDisabled(!count);
				button.onClick(() => {
					if (!this.confirmClear) {
						this.confirmClear = true;
						button.setButtonText("Click again to confirm").setWarning();
						return;
					}
					void this.plugin.updateSettings({ items: {} }).then(() => this.display());
				});
			});
	}

	private defaultsSetting(name: string, type: "folder" | "file"): void {
		const style = type === "folder" ? this.plugin.settings.folderDefaults : this.plugin.settings.fileDefaults;
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(
				type === "folder"
					? "Colors and text style for every folder that has no style of its own."
					: "Colors and text style for every file that has no style of its own."
			)
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
							.then(() => this.display());
					})
			);
	}

	private renderCustomIcons(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Your icons").setHeading();
		new Setting(containerEl)
			.setName("Upload icons")
			.setDesc(
				"SVG, PNG, JPG, WebP, GIF or AVIF, up to 512 KB each. They are saved in the plugin folder and show up in the “Your icons” tab when you change an icon."
			)
			.addButton((button) =>
				button.setButtonText("Upload").onClick(async () => {
					const files = await chooseFiles(containerEl.ownerDocument);
					if (!files.length) return;
					await uploadIcons(this.plugin, files);
					this.display();
				})
			);

		const names = this.plugin.customIcons.list();
		if (!names.length) return;
		const grid = containerEl.createDiv({ cls: "fs-custom-list" });
		for (const name of names) {
			const card = grid.createDiv({ cls: "fs-custom-card" });
			card.createEl("img", { attr: { src: this.plugin.customIcons.url(name), alt: "" } });
			card.createDiv({ cls: "fs-custom-name", text: iconLabel(name) });
			const remove = card.createEl("button", {
				cls: "fs-custom-remove clickable-icon",
				attr: { "aria-label": `Delete ${iconLabel(name)}` },
			});
			setIcon(remove, "x");
			setTooltip(remove, "Delete icon");
			remove.addEventListener("click", () => {
				void this.plugin.removeCustomIcon(name).then(() => this.display());
			});
		}
	}
}
