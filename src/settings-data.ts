/**
 * Formato das configurações e validação do que vem do data.json.
 */
import { isColor } from "./colors";

export type TextSize = "small" | "large";

export interface ItemStyle {
	/** Id de ícone do Obsidian, `custom:<arquivo>` ou "none". Vazio = automático. */
	icon?: string;
	iconColor?: string;
	textColor?: string;
	background?: string;
	bold?: boolean;
	italic?: boolean;
	/** Vazio = tamanho normal. */
	size?: TextSize;
}

export interface FolderStylesSettings {
	/** Ícone automático por tipo para itens sem ícone escolhido. */
	autoIcons: boolean;
	/** Ícones automáticos coloridos por tipo. */
	typeColors: boolean;
	/** Esconde a etiqueta de extensão (PDF, PNG…) ao lado do nome. */
	hideBadges: boolean;
	/** Itens dentro de uma pasta herdam o estilo dela. */
	inherit: boolean;
	folderDefaults: ItemStyle;
	fileDefaults: ItemStyle;
	/** Caminho → ícone e estilo escolhidos pelo usuário. */
	items: Record<string, ItemStyle>;
}

export const DEFAULT_SETTINGS: FolderStylesSettings = {
	autoIcons: true,
	typeColors: true,
	hideBadges: false,
	inherit: false,
	folderDefaults: {},
	fileDefaults: {},
	items: {},
};

export const CUSTOM_PREFIX = "custom:";
export const NO_ICON = "none";

/** Remove campos vazios; um estilo sem nada vira `{}`. */
export function cleanStyle(style: ItemStyle): ItemStyle {
	const out: ItemStyle = {};
	if (style.icon) out.icon = style.icon;
	if (style.iconColor && isColor(style.iconColor)) out.iconColor = style.iconColor;
	if (style.textColor && isColor(style.textColor)) out.textColor = style.textColor;
	if (style.background && isColor(style.background)) out.background = style.background;
	if (style.bold) out.bold = true;
	if (style.italic) out.italic = true;
	if (style.size === "small" || style.size === "large") out.size = style.size;
	return out;
}

export const isEmptyStyle = (style: ItemStyle): boolean => Object.keys(style).length === 0;

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export function sanitizeStyle(value: unknown): ItemStyle {
	if (!isObject(value)) return {};
	return cleanStyle({
		icon: typeof value.icon === "string" ? value.icon : undefined,
		iconColor: typeof value.iconColor === "string" ? value.iconColor : undefined,
		textColor: typeof value.textColor === "string" ? value.textColor : undefined,
		background: typeof value.background === "string" ? value.background : undefined,
		bold: value.bold === true,
		italic: value.italic === true,
		size: value.size === "small" || value.size === "large" ? value.size : undefined,
	});
}

export function sanitizeSettings(raw: unknown): FolderStylesSettings {
	const data = isObject(raw) ? raw : {};
	const bool = (key: keyof FolderStylesSettings): boolean => {
		const value = data[key];
		return typeof value === "boolean" ? value : (DEFAULT_SETTINGS[key] as boolean);
	};
	const items: Record<string, ItemStyle> = {};
	if (isObject(data.items)) {
		for (const [path, value] of Object.entries(data.items)) {
			const style = sanitizeStyle(value);
			if (!isEmptyStyle(style)) items[path] = style;
		}
	}
	const defaults = (value: unknown): ItemStyle => {
		// Os padrões não têm ícone: o ícone automático vem do tipo.
		const style = sanitizeStyle(value);
		delete style.icon;
		return style;
	};
	return {
		autoIcons: bool("autoIcons"),
		typeColors: bool("typeColors"),
		hideBadges: bool("hideBadges"),
		inherit: bool("inherit"),
		folderDefaults: defaults(data.folderDefaults),
		fileDefaults: defaults(data.fileDefaults),
		items,
	};
}

/**
 * Atualiza as chaves depois de renomear ou mover `oldPath` para `newPath`
 * (inclui tudo dentro, se for pasta). Devolve se algo mudou.
 */
export function moveItems(items: Record<string, ItemStyle>, oldPath: string, newPath: string): boolean {
	let changed = false;
	const prefix = `${oldPath}/`;
	for (const key of Object.keys(items)) {
		let next: string | null = null;
		if (key === oldPath) next = newPath;
		else if (key.startsWith(prefix)) next = newPath + key.slice(oldPath.length);
		if (next === null || next === key) continue;
		items[next] = items[key];
		delete items[key];
		changed = true;
	}
	return changed;
}

/** Apaga o item e tudo dentro dele. Devolve se algo mudou. */
export function removeItems(items: Record<string, ItemStyle>, path: string): boolean {
	let changed = false;
	const prefix = `${path}/`;
	for (const key of Object.keys(items)) {
		if (key === path || key.startsWith(prefix)) {
			delete items[key];
			changed = true;
		}
	}
	return changed;
}
