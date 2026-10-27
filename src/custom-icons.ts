/**
 * Ícones enviados pelo usuário, guardados na pasta "icons" do plugin
 * (.obsidian/plugins/folder-styles/icons). Ficam fora das notas e vão junto
 * com o plugin quando a pasta de configuração é sincronizada.
 */
import { App, normalizePath } from "obsidian";

const EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp", "gif", "avif"];
export const ACCEPT = EXTENSIONS.map((ext) => `.${ext}`).join(",");
/** Ícones são pequenos; isso evita arquivos enormes na pasta de configuração. */
export const MAX_BYTES = 512 * 1024;

const extensionOf = (name: string): string => {
	const dot = name.lastIndexOf(".");
	return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
};

export const isIconFile = (name: string): boolean => EXTENSIONS.includes(extensionOf(name));

/** "Logo do time (1).PNG" → "Logo do time (1).png", sem barras nem caracteres proibidos. */
function safeName(name: string): string {
	const ext = extensionOf(name);
	const base = name
		.slice(0, name.length - ext.length - 1)
		.replace(/[\\/:*?"<>|#^[\]]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return `${base || "icon"}.${ext}`;
}

/** Nome para mostrar: sem extensão, com traços e sublinhados virando espaços. */
export const iconLabel = (name: string): string =>
	name.slice(0, name.lastIndexOf(".")).replace(/[_-]+/g, " ").trim() || name;

export class UploadError extends Error {}

export class CustomIcons {
	private names = new Set<string>();

	constructor(
		private app: App,
		private dir: string
	) {}

	async load(): Promise<void> {
		this.names.clear();
		const { adapter } = this.app.vault;
		if (!(await adapter.exists(this.dir))) return;
		const listing = await adapter.list(this.dir);
		for (const path of listing.files) {
			const name = path.slice(path.lastIndexOf("/") + 1);
			if (isIconFile(name)) this.names.add(name);
		}
	}

	has(name: string): boolean {
		return this.names.has(name);
	}

	list(): string[] {
		return [...this.names].sort((a, b) =>
			a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
		);
	}

	url(name: string): string {
		return this.app.vault.adapter.getResourcePath(this.pathOf(name));
	}

	/** Salva o arquivo e devolve o nome com que ficou guardado. */
	async add(file: File): Promise<string> {
		if (!isIconFile(file.name)) {
			throw new UploadError(`“${file.name}” is not an image. Use SVG, PNG, JPG, WebP, GIF or AVIF.`);
		}
		if (file.size > MAX_BYTES) {
			throw new UploadError(`“${file.name}” is larger than 512 KB.`);
		}
		const { adapter } = this.app.vault;
		if (!(await adapter.exists(this.dir))) await adapter.mkdir(this.dir);

		const wanted = safeName(file.name);
		const ext = extensionOf(wanted);
		const base = wanted.slice(0, wanted.length - ext.length - 1);
		let name = wanted;
		for (let n = 2; this.names.has(name) || (await adapter.exists(this.pathOf(name))); n++) {
			name = `${base} ${n}.${ext}`;
		}

		await adapter.writeBinary(this.pathOf(name), await file.arrayBuffer());
		this.names.add(name);
		return name;
	}

	async remove(name: string): Promise<void> {
		const path = this.pathOf(name);
		const { adapter } = this.app.vault;
		if (await adapter.exists(path)) await adapter.remove(path);
		this.names.delete(name);
	}

	private pathOf(name: string): string {
		return normalizePath(`${this.dir}/${name}`);
	}
}

/** Abre o seletor de arquivos do sistema. Resolve com [] se o usuário cancelar. */
export function chooseFiles(): Promise<File[]> {
	return new Promise((resolve) => {
		const input = createEl("input", { type: "file", attr: { accept: ACCEPT, multiple: "" } });
		input.addEventListener("change", () => resolve(Array.from(input.files ?? [])));
		input.addEventListener("cancel", () => resolve([]));
		input.click();
	});
}
