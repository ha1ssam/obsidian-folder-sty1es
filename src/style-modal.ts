/**
 * Janela "Edit style": cores do ícone, do nome e do fundo, negrito, itálico
 * e tamanho, com uma prévia da linha. Cada mudança é aplicada na hora.
 */
import { App, Modal, Setting, setIcon, setTooltip } from "obsidian";
import { PRESET_COLORS, colorName, colorToCss, isHexColor } from "./colors";
import { backgroundCss } from "./css";
import { drawIcon } from "./explorer";
import { KIND_COLORS, Kind } from "./kinds";
import type FolderStylesPlugin from "./main";
import { ItemStyle, TextSize, cleanStyle } from "./settings-data";

export interface StyleTarget {
	heading: string;
	/** Nome mostrado na prévia. */
	name: string;
	kind: Kind;
	/** Chave do ícone para a prévia (ver drawIcon). */
	iconKey: string;
	initial: ItemStyle;
	onChange: (style: ItemStyle) => void;
}

type ColorField = "iconColor" | "textColor" | "background";

export class StyleModal extends Modal {
	private style: ItemStyle;
	private previewEl!: HTMLElement;
	private syncers: (() => void)[] = [];

	constructor(
		app: App,
		private plugin: FolderStylesPlugin,
		private target: StyleTarget
	) {
		super(app);
		this.style = { ...target.initial };
		delete this.style.icon;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass("fs-modal", "fs-style-modal");
		this.titleEl.setText(this.target.heading);

		this.previewEl = contentEl.createDiv({ cls: "fs-preview" });
		const icon = this.previewEl.createSpan({ cls: "fs-icon", attr: { "aria-hidden": "true" } });
		if (this.target.iconKey !== "none") {
			drawIcon(icon, this.target.iconKey, this.target.kind, this.plugin);
		}
		this.previewEl.createSpan({ cls: "fs-preview-name", text: this.target.name });

		this.colorSetting("Icon color", "iconColor");
		this.colorSetting("Name color", "textColor");
		this.colorSetting("Background", "background");

		new Setting(contentEl).setName("Bold").addToggle((toggle) => {
			toggle.onChange((value) => this.update({ bold: value }));
			this.syncers.push(() => toggle.setValue(!!this.style.bold));
		});
		new Setting(contentEl).setName("Italic").addToggle((toggle) => {
			toggle.onChange((value) => this.update({ italic: value }));
			this.syncers.push(() => toggle.setValue(!!this.style.italic));
		});
		new Setting(contentEl).setName("Text size").addDropdown((dropdown) => {
			dropdown
				.addOptions({ small: "Small", normal: "Normal", large: "Large" })
				.onChange((value) =>
					this.update({ size: value === "normal" ? undefined : (value as TextSize) })
				);
			this.syncers.push(() => dropdown.setValue(this.style.size ?? "normal"));
		});

		new Setting(contentEl)
			.addButton((button) =>
				button.setButtonText("Reset").onClick(() => {
					this.style = {};
					this.emit();
					this.sync();
				})
			)
			.addButton((button) => button.setButtonText("Done").setCta().onClick(() => this.close()));

		this.sync();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private update(patch: Partial<ItemStyle>): void {
		this.style = { ...this.style, ...patch };
		this.emit();
		this.updatePreview();
	}

	private emit(): void {
		this.target.onChange(cleanStyle(this.style));
	}

	private sync(): void {
		for (const sync of this.syncers) sync();
		this.updatePreview();
	}

	private updatePreview(): void {
		const { style } = this;
		const auto = this.plugin.settings.typeColors ? KIND_COLORS[this.target.kind] : undefined;
		const iconColor = style.iconColor ?? auto;
		this.previewEl.setCssProps({
			"--fs-preview-icon": iconColor ? colorToCss(iconColor) : "",
			"--fs-preview-text": style.textColor ? colorToCss(style.textColor) : "",
			"--fs-preview-bg": style.background ? backgroundCss(style.background) : "",
		});
		this.previewEl.toggleClass("is-bold", !!style.bold);
		this.previewEl.toggleClass("is-italic", !!style.italic);
		this.previewEl.toggleClass("is-small", style.size === "small");
		this.previewEl.toggleClass("is-large", style.size === "large");
	}

	/** Linha de cor: "nenhuma", as cores prontas e uma cor livre. */
	private colorSetting(name: string, field: ColorField): void {
		const setting = new Setting(this.contentEl).setName(name);
		setting.settingEl.addClass("fs-color-setting");
		const row = setting.controlEl.createDiv({ cls: "fs-swatches" });
		const swatches = new Map<string, HTMLElement>();

		const pick = (value: string | undefined) => {
			this.update({ [field]: value });
			refresh();
		};

		const none = row.createEl("button", { cls: "fs-swatch is-none", attr: { "aria-label": "None" } });
		setIcon(none, "ban");
		setTooltip(none, "None");
		none.addEventListener("click", () => pick(undefined));
		swatches.set("", none);

		for (const color of PRESET_COLORS) {
			const swatch = row.createEl("button", { cls: "fs-swatch", attr: { "aria-label": color.name } });
			swatch.setCssProps({ "--fs-swatch": color.css });
			setTooltip(swatch, color.name);
			swatch.addEventListener("click", () => pick(color.id));
			swatches.set(color.id, swatch);
		}

		const custom = row.createEl("label", { cls: "fs-swatch is-custom" });
		setTooltip(custom, "Custom color");
		const input = custom.createEl("input", { attr: { type: "color", "aria-label": "Custom color" } });
		input.addEventListener("change", () => pick(input.value));
		setIcon(custom.createSpan({ cls: "fs-swatch-plus" }), "plus");

		const refresh = () => {
			const value = this.style[field] ?? "";
			const isCustom = isHexColor(value);
			for (const [id, el] of swatches) el.toggleClass("is-selected", id === value);
			custom.toggleClass("is-selected", isCustom);
			custom.setCssProps({ "--fs-swatch": isCustom ? value : "" });
			if (isCustom) input.value = value;
			setting.setDesc(value ? colorName(value) : "None");
		};
		this.syncers.push(refresh);
	}
}
