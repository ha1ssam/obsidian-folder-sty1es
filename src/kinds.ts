/**
 * Tipos de item do explorador e o ícone automático de cada um.
 *
 * Cada tipo lista ícones candidatos: o primeiro que existir na versão do
 * Obsidian instalada é usado (os nomes do Lucide mudam entre versões).
 */
import { getIcon } from "obsidian";

export type Kind =
	| "folder"
	| "note"
	| "canvas"
	| "base"
	| "pdf"
	| "image"
	| "audio"
	| "video"
	| "code"
	| "data"
	| "archive"
	| "document"
	| "other";

const EXTENSIONS: Record<string, Kind> = {};
const register = (kind: Kind, list: string): void => {
	for (const ext of list.split(" ")) EXTENSIONS[ext] = kind;
};
register("note", "md");
register("canvas", "canvas");
register("base", "base");
register("pdf", "pdf");
register("image", "png jpg jpeg gif webp svg bmp avif heic tif tiff ico");
register("audio", "mp3 wav m4a ogg flac aac opus 3gp");
register("video", "mp4 mov mkv webm ogv avi");
register(
	"code",
	"js mjs cjs ts tsx jsx css scss html htm xml py rb go rs java kt c h cpp hpp cs php sh bash zsh ps1 lua swift sql r"
);
register("data", "json yaml yml toml csv tsv xls xlsx ods");
register("archive", "zip rar 7z tar gz tgz bz2 xz");
register("document", "txt rtf doc docx odt ppt pptx odp epub");

/** Ícones candidatos por tipo, do preferido ao reserva. */
const KIND_ICONS: Record<Kind, string[]> = {
	folder: ["folder"],
	note: ["file-text"],
	canvas: ["layout-dashboard", "layout"],
	base: ["table-2", "table"],
	pdf: ["book-open-text", "book-open"],
	image: ["image"],
	audio: ["file-audio", "music"],
	video: ["file-video", "film"],
	code: ["file-code", "code"],
	data: ["file-spreadsheet", "sheet", "table"],
	archive: ["file-archive", "archive"],
	document: ["file-type", "file-text"],
	other: ["file"],
};

export const FOLDER_OPEN_ICONS = ["folder-open"];

/** Cores automáticas por tipo (ids de src/colors.ts). Notas ficam na cor do tema. */
export const KIND_COLORS: Partial<Record<Kind, string>> = {
	folder: "accent",
	canvas: "yellow",
	base: "cyan",
	pdf: "red",
	image: "purple",
	audio: "orange",
	video: "pink",
	code: "cyan",
	data: "green",
	archive: "gray",
	document: "blue",
};

export function kindOf(path: string, folder: boolean): Kind {
	if (folder) return "folder";
	const name = path.slice(path.lastIndexOf("/") + 1);
	const dot = name.lastIndexOf(".");
	if (dot <= 0) return "other";
	return EXTENSIONS[name.slice(dot + 1).toLowerCase()] ?? "other";
}

const existing = new Map<string, boolean>();

export function iconExists(id: string): boolean {
	let found = existing.get(id);
	if (found === undefined) {
		found = getIcon(id) !== null;
		existing.set(id, found);
	}
	return found;
}

export function firstIcon(candidates: string[]): string {
	return candidates.find(iconExists) ?? "file";
}

export const kindIcon = (kind: Kind): string => firstIcon(KIND_ICONS[kind]);
