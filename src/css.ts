/**
 * Folha de estilo gerada a partir das configurações.
 *
 * Cada item é achado pelo atributo data-path que o próprio Obsidian põe nas
 * linhas do explorador, então não é preciso mexer em cada elemento. A herança
 * usa o prefixo do caminho (`[data-path^="Pasta/"]`).
 *
 * Ordem das regras (mesma especificidade, a última vence):
 * cores por tipo → padrões → herdadas (da pasta mais rasa à mais funda) →
 * estilo do próprio item.
 */
import { colorToCss } from "./colors";
import { KIND_COLORS, Kind } from "./kinds";
import { FolderStylesSettings, ItemStyle } from "./settings-data";

const ROOT = '.workspace-leaf-content[data-type="file-explorer"]';
const TITLE = ":is(.nav-file-title, .nav-folder-title)";
const CONTENT = ":is(.nav-file-title-content, .nav-folder-title-content)";

/** Texto entre aspas para um seletor de atributo. */
export function cssString(text: string): string {
	return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ")}"`;
}

const SIZES = {
	small: "calc(var(--nav-item-size, var(--font-ui-small)) * 0.9)",
	large: "calc(var(--nav-item-size, var(--font-ui-small)) * 1.15)",
};

/** Mistura a cor com transparência, para o fundo não brigar com o texto. */
export const backgroundCss = (color: string): string =>
	`color-mix(in srgb, ${colorToCss(color)} 18%, transparent)`;

function styleRules(selector: string, style: ItemStyle): string[] {
	const rules: string[] = [];
	const text: string[] = [];
	if (style.textColor) text.push(`color: ${colorToCss(style.textColor)};`);
	if (style.bold) text.push("font-weight: var(--font-semibold, 600);");
	if (style.italic) text.push("font-style: italic;");
	if (text.length) rules.push(`${selector} ${CONTENT} { ${text.join(" ")} }`);
	if (style.size) rules.push(`${selector} { font-size: ${SIZES[style.size]}; }`);
	if (style.iconColor) rules.push(`${selector} .fs-icon { color: ${colorToCss(style.iconColor)}; }`);
	if (style.background) {
		// Sem fundo próprio ao passar o mouse ou no item aberto: o destaque do tema aparece.
		rules.push(
			`${selector}:not(:hover):not(.is-active) { background-color: ${backgroundCss(style.background)}; }`
		);
	}
	return rules;
}

const depth = (path: string): number => path.split("/").length;

export function buildCss(settings: FolderStylesSettings): string {
	const rules: string[] = [];

	if (settings.typeColors) {
		for (const [kind, color] of Object.entries(KIND_COLORS) as [Kind, string][]) {
			rules.push(`${ROOT} .fs-icon[data-fs-kind="${kind}"] { color: ${colorToCss(color)}; }`);
		}
	}
	if (settings.hideBadges) rules.push(`${ROOT} .nav-file-tag { display: none; }`);

	rules.push(...styleRules(`${ROOT} .nav-folder-title`, settings.folderDefaults));
	rules.push(...styleRules(`${ROOT} .nav-file-title`, settings.fileDefaults));

	const items = Object.entries(settings.items).sort(([a], [b]) => depth(a) - depth(b));
	if (settings.inherit) {
		for (const [path, style] of items) {
			rules.push(...styleRules(`${ROOT} ${TITLE}[data-path^=${cssString(`${path}/`)}]`, style));
		}
	}
	for (const [path, style] of items) {
		rules.push(...styleRules(`${ROOT} ${TITLE}[data-path=${cssString(path)}]`, style));
	}

	return rules.join("\n");
}

/**
 * Folha construída (`adoptedStyleSheets`) presente em todas as janelas, como
 * no Checkbox Sty1es: sem elementos <style> criados pelo plugin.
 */
export class DynamicStyles {
	private css = "";
	private sheets = new Map<Document, CSSStyleSheet>();

	attach(doc: Document): void {
		const win = doc.defaultView;
		if (!win || this.sheets.has(doc)) return;
		const sheet = new win.CSSStyleSheet();
		sheet.replaceSync(this.css);
		doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
		this.sheets.set(doc, sheet);
	}

	set(css: string): void {
		this.css = css;
		for (const [doc, sheet] of this.sheets) {
			if (!doc.defaultView) {
				this.sheets.delete(doc);
				continue;
			}
			sheet.replaceSync(css);
		}
	}

	detachAll(): void {
		for (const [doc, sheet] of this.sheets) {
			doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter((s) => s !== sheet);
		}
		this.sheets.clear();
	}
}
