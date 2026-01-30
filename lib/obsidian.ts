import { App, TFile } from "obsidian";
import { Notice, getLinkpath } from "obsidian";
import { moment } from "obsidian";
import { extractLinktext } from "./utils";
import { NextNoteSuggestModal } from "./NextNoteSuggestModal";

/**
 * Get the currently active file.
 */
export function getActiveFile(app: App): TFile | null {
	return app.workspace.getActiveFile();
}

/**
 * Retrieve the `previous` linkpath from the file's frontmatter.
 * @returns Extracted linkpath from the `previous` property, or null if not found.
 */
export function getPreviousLinkpath(app: App, file: TFile): string | null {
	const cache = app.metadataCache.getFileCache(file);
	const previousName = cache?.frontmatter?.previous;

	if (!previousName?.includes("[[")) {
		return null;
	}

	return getLinkpath(extractLinktext(previousName));
}

/**
 * Determine if a file is daily note given it's basename
 * TODO not hardcode the date format, see how daily note/ calendar/ periodic note do it, maybe daily note has api to get it's format
 */
export function isDailyNote(fileBasename: string): boolean {
	return moment(fileBasename, "DD-MM-YY", true).isValid();
}

// TODO use metadata cache approach instead of this linear scan with limit approach,
// TODO refactor the following 2 functions into sth like findAdjDailyNote with direction para
export function getPreviousDailyNote(app: App, file: TFile): TFile | null {
	const format = "DD-MM-YY";
	const maxDaysToSearch = 365;
	let searchDate = moment(file.basename, format).subtract(1, "days");
	const currentFilePath = file?.path || "";

	for (let i = 0; i < maxDaysToSearch; i++) {
		const target = app.metadataCache.getFirstLinkpathDest(
			searchDate.format(format),
			currentFilePath,
		);
		if (target != null) {
			return target;
		}
		searchDate.subtract(1, "days");
	}
	return null;
}

export function getNextDailyNote(app: App, file: TFile): TFile | null {
	const format = "DD-MM-YY";
	const maxDaysToSearch = 365;
	let searchDate = moment(file.basename, format).add(1, "days");
	const currentFilePath = file?.path || "";

	for (let i = 0; i < maxDaysToSearch; i++) {
		const target = app.metadataCache.getFirstLinkpathDest(
			searchDate.format(format),
			currentFilePath,
		);
		if (target != null) {
			return target;
		}
		searchDate.add(1, "days");
	}
	return null;
}

/**
 * Retrieve the previous note based on the `previous` property in the frontmatter.
 */
// ? how to get the daily note just b4 it though? daily note has diff name format, e.g dd-MM-yy, looping O(n)?
// let's assume the format is dd-MM-yy for now
export function getPreviousNote(app: App, file: TFile): TFile | null {
	const previousLinkpath = getPreviousLinkpath(app, file);
	if (!previousLinkpath) {
		// check if note is daily
		if (isDailyNote(file.basename)) {
			return getPreviousDailyNote(app, file);
		}
		// TODO feature for handling weekly note later
		return null;
	}

	const target = app.metadataCache.getFirstLinkpathDest(
		previousLinkpath,
		file.path,
	);

	if (!target) {
		new Notice(`Note "${previousLinkpath}" was not found.`);
		return null;
	}

	return target;
}

/**
 * Retrieve notes that list the current file as their `previous` note.
 */
export function getNextNotes(app: App, file: TFile): TFile[] {
	const currentPath = file.path;
	const backlinks = app.metadataCache.resolvedLinks;
	const nextNotes: TFile[] = [];

	for (const [sourcePath, targets] of Object.entries(backlinks)) {
		// Check if the source note links to the current note.
		if (!targets[currentPath]) {
			continue;
		}

		const targetFile = app.vault.getAbstractFileByPath(sourcePath);
		if (!(targetFile instanceof TFile)) {
			continue;
		}

		const previousLinkText = getPreviousLinkpath(app, targetFile);
		if (!previousLinkText) {
			continue;
		}

		// Add only if the `previous` field points to the current note.
		if (
			previousLinkText === file.basename ||
			previousLinkText === currentPath
		) {
			nextNotes.push(targetFile);
		}
	}

	// handle daily note implicit next notes
	if (isDailyNote(file.basename)) {
		const nextDailyNote = getNextDailyNote(app, file);
		if (nextDailyNote != null && !nextNotes.includes(nextDailyNote)) {
			nextNotes.push(nextDailyNote);
		}
	}

	return nextNotes;
}

export async function detachNote(
	app: App,
	file: TFile,
	options?: { showNotification?: boolean },
): Promise<void> {
	const showNotification = options?.showNotification ?? false;
	const previousLinkpath = getPreviousLinkpath(app, file);
	const nextNotes = getNextNotes(app, file);

	// Update next notes
	for (const nextNote of nextNotes) {
		await app.fileManager.processFrontMatter(nextNote, (fm) => {
			if (previousLinkpath) {
				// Point to the previous note
				fm.previous = `[[${previousLinkpath}]]`;
			} else {
				// No previous note, so nextNote becomes a root
				fm.previous = "ROOT";
			}
		});
	}

	// Update current note (remove previous)
	await app.fileManager.processFrontMatter(file, (fm) => {
		delete fm.previous;
	});

	if (showNotification) {
		new Notice(`Detached note: ${file.basename}`);
	}
}

/**
 * Sets the `previous` property in the file's frontmatter to the specified link.
 *
 * @param app - The Obsidian App instance.
 * @param file - The file to modify.
 * @param previousLink - The link path or name to set as the previous note.
 */
export async function setPreviousProperty(
	app: App,
	file: TFile,
	previousLink: string,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		fm.previous = `[[${previousLink}]]`;
	});
}

export async function findLastNote(
	app: App,
	startNote: TFile,
): Promise<TFile | null> {
	let lastNote = startNote;
	while (true) {
		const nextNotes = getNextNotes(app, lastNote);
		if (nextNotes.length === 0 || nextNotes.includes(startNote)) {
			break;
		}

		if (nextNotes.length === 1) {
			// If only one next note exists, follow it.
			lastNote = nextNotes[0];
		} else {
			// If multiple candidates exist, open a suggestion modal.
			const selectedNote = await new Promise<TFile | null>((resolve) => {
				new NextNoteSuggestModal(app, nextNotes, resolve).open();
			});

			if (!selectedNote) {
				// If the user cancels selection, stop.
				return null;
			}

			lastNote = selectedNote;
		}
	}
	return lastNote;
}

export async function findFirstNote(
	app: App,
	startNote: TFile,
): Promise<TFile> {
	let firstNote = startNote;
	while (true) {
		const previousNote = getPreviousNote(app, firstNote);
		if (!previousNote || previousNote === startNote) {
			break;
		}
		firstNote = previousNote;
	}
	return firstNote;
}
