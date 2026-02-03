import { App, TFile } from "obsidian";
import { Notice, getLinkpath } from "obsidian";
import { moment } from "obsidian";
import { extractLinktext } from "./utils";
import { MyPluginSettings } from "./settings";
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
 * Determine if a file is daily note
 */
function isDailyNote(file: TFile, dailyNoteFormat: string, folderPath: string): boolean {
  const result = file.parent?.path === folderPath && moment(file.basename, dailyNoteFormat, true).isValid(); 
  return result;
}

/**
 * Determine if a file is a weekly note
 */
function isWeeklyNote(file: TFile, weeklyNoteFormat: string, folderPath: string): boolean {
  return file.parent?.path === folderPath && moment(file.basename, weeklyNoteFormat, true).isValid();
}

/**
 * Helper to find adjacent periodic notes (daily/weekly).
 */
// TODO use metadata cache approach instead of this linear scan with limit approach
function findAdjacentPeriodicNote(
  app: App,
  file: TFile,
  format: string,
  direction: 1 | -1,
  unit: 'days' | 'weeks',
  limit: number,
  folderPath: string
): TFile | null {
  let searchDate = moment(file.basename, format).add(direction, unit);
  for (let i = 0; i < limit; i++) {
    let searchLinktext = "";
    if (folderPath === '/') {
      searchLinktext = searchDate.format(format);
    }
    else {
      searchLinktext = `${folderPath}/${searchDate.format(format)}`;
    }
    const target = app.metadataCache.getFirstLinkpathDest(searchLinktext, "");
    if (unit === 'days' && target && isDailyNote(target, format, folderPath)) {
      return target;
    }
    if (unit === 'weeks' && target && isWeeklyNote(target, format, folderPath)){
      return target;
    }
    searchDate.add(direction, unit);
  }
  return null;
}

function getPreviousDailyNote(app: App, file: TFile, dailyNoteFormat: string, folderPath: string): TFile | null {
  return findAdjacentPeriodicNote(app, file, dailyNoteFormat, -1, 'days', 365, folderPath);
}

function getNextDailyNote(app: App, file: TFile, dailyNoteFormat: string, folderPath: string): TFile | null {
  return findAdjacentPeriodicNote(app, file, dailyNoteFormat, 1, 'days', 365, folderPath);
}

function getPreviousWeeklyNote(app: App, file: TFile, weeklyNoteFormat: string, folderPath: string): TFile | null {
  return findAdjacentPeriodicNote(app, file, weeklyNoteFormat, -1, 'weeks', 52, folderPath);
}

function getNextWeeklyNote(app: App, file: TFile, weeklyNoteFormat: string, folderPath: string): TFile | null {
  return findAdjacentPeriodicNote(app, file, weeklyNoteFormat, 1, 'weeks', 52, folderPath);
}

/**
 * Retrieve the previous note based on the `previous` property in the frontmatter.
 */
export function getPreviousNote(app: App, file: TFile, settings: MyPluginSettings): TFile | null {
  const previousLinkpath = getPreviousLinkpath(app, file);
  if (!previousLinkpath) {
    // handle daily note nav
    if (settings.enableDailyNoteNav && isDailyNote(file, settings.dailyNoteFormat, settings.dailyFolder)) {
      return getPreviousDailyNote(app, file, settings.dailyNoteFormat, settings.dailyFolder);
    }
    // handle weekly note nav
    if (settings.enableWeeklyNoteNav && isWeeklyNote(file, settings.weeklyNoteFormat, settings.weeklyFolder)) {
      return getPreviousWeeklyNote(app, file, settings.weeklyNoteFormat, settings.weeklyFolder);
    }
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
export function getNextNotes(
	app: App,
	file: TFile,
	settings: MyPluginSettings,
): TFile[] {
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
  if (settings.enableDailyNoteNav && isDailyNote(file, settings.dailyNoteFormat, settings.dailyFolder)) {
    const nextDailyNote = getNextDailyNote(app, file, settings.dailyNoteFormat, settings.dailyFolder);
    if (nextDailyNote != null && !nextNotes.includes(nextDailyNote)) {
      nextNotes.push(nextDailyNote);
    }
  }

  // handle weekly note implicit next notes
  if (settings.enableWeeklyNoteNav && isWeeklyNote(file, settings.weeklyNoteFormat, settings.weeklyFolder)) {
    const nextWeeklyNote = getNextWeeklyNote(app, file, settings.weeklyNoteFormat, settings.weeklyFolder);
    if (nextWeeklyNote != null && !nextNotes.includes(nextWeeklyNote)) {
      nextNotes.push(nextWeeklyNote);
    }
  }

	return nextNotes;
}

export async function detachNote(
	app: App,
	file: TFile,
	settings: MyPluginSettings,
	options?: { showNotification?: boolean },
): Promise<void> {
	const showNotification = options?.showNotification ?? false;
	const previousLinkpath = getPreviousLinkpath(app, file);
	const nextNotes = getNextNotes(app, file, settings);

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
	settings: MyPluginSettings,
): Promise<TFile | null> {
	let lastNote = startNote;
	while (true) {
		const nextNotes = getNextNotes(app, lastNote, settings);
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
	settings: MyPluginSettings,
): Promise<TFile> {
	let firstNote = startNote;
	while (true) {
		const previousNote = getPreviousNote(app, firstNote, settings);
		if (!previousNote || previousNote === startNote) {
			break;
		}
		firstNote = previousNote;
	}
	return firstNote;
}
