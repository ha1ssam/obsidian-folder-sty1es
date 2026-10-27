/**
 * Cores prontas (variáveis do tema, então seguem o claro e o escuro) e cores
 * livres no formato #rrggbb.
 */

export interface PresetColor {
	id: string;
	name: string;
	css: string;
}

export const PRESET_COLORS: PresetColor[] = [
	{ id: "accent", name: "Accent", css: "var(--color-accent)" },
	{ id: "red", name: "Red", css: "var(--color-red)" },
	{ id: "orange", name: "Orange", css: "var(--color-orange)" },
	{ id: "yellow", name: "Yellow", css: "var(--color-yellow)" },
	{ id: "green", name: "Green", css: "var(--color-green)" },
	{ id: "cyan", name: "Cyan", css: "var(--color-cyan)" },
	{ id: "blue", name: "Blue", css: "var(--color-blue)" },
	{ id: "purple", name: "Purple", css: "var(--color-purple)" },
	{ id: "pink", name: "Pink", css: "var(--color-pink)" },
	{ id: "gray", name: "Gray", css: "var(--text-muted)" },
];

const PRESETS = new Map(PRESET_COLORS.map((color) => [color.id, color]));
const HEX = /^#[0-9a-f]{6}$/i;

export const isHexColor = (value: string): boolean => HEX.test(value);

export const isColor = (value: unknown): value is string =>
	typeof value === "string" && (PRESETS.has(value) || HEX.test(value));

/** Valor salvo → valor CSS. */
export function colorToCss(value: string): string {
	return PRESETS.get(value)?.css ?? value;
}

export function colorName(value: string): string {
	return PRESETS.get(value)?.name ?? value.toUpperCase();
}
