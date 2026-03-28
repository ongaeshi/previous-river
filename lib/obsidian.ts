import { App, TFile } from "obsidian";
import { Notice, getLinkpath } from "obsidian";
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
 * Retrieve the previous note based on the `previous` property in the frontmatter.
 */
export function getPreviousNote(app: App, file: TFile): TFile | null {
  const previousLinkpath = getPreviousLinkpath(app, file);
  if (!previousLinkpath) {
    return null;
  }

  const target = app.metadataCache.getFirstLinkpathDest(
    previousLinkpath,
    file.path
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

  // Use Object properties directly (for...in) instead of Object.entries to prevent huge array allocations
  for (const sourcePath in backlinks) {
    if (!Object.prototype.hasOwnProperty.call(backlinks, sourcePath)) continue;

    const targets = backlinks[sourcePath];
    // Check if the source note links to the current note
    if (!targets || !targets[currentPath]) {
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
    if (previousLinkText === file.basename || previousLinkText === currentPath) {
      nextNotes.push(targetFile);
    }
  }

  return nextNotes;
}

export async function detachNote(app: App, file: TFile, options?: { showNotification?: boolean }): Promise<void> {
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
export async function setPreviousProperty(app: App, file: TFile, previousLink: string): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.previous = `[[${previousLink}]]`;
  });
}

export function buildReverseCache(app: App): Record<string, string[]> {
  const resolvedLinks = app.metadataCache.resolvedLinks;
  const cache: Record<string, string[]> = {};

  for (const sourcePath in resolvedLinks) {
    if (!Object.prototype.hasOwnProperty.call(resolvedLinks, sourcePath)) continue;

    const targets = resolvedLinks[sourcePath];
    for (const targetPath in targets) {
      if (!Object.prototype.hasOwnProperty.call(targets, targetPath)) continue;

      if (!cache[targetPath]) cache[targetPath] = [];
      cache[targetPath].push(sourcePath);
    }
  }
  return cache;
}

export function getNextNotesWithCache(app: App, file: TFile, reverseCache: Record<string, string[]>): TFile[] {
  const currentPath = file.path;
  const nextNotes: TFile[] = [];

  const sourcePaths = reverseCache[currentPath];
  if (!sourcePaths) return nextNotes;

  for (const sourcePath of sourcePaths) {
    const targetFile = app.vault.getAbstractFileByPath(sourcePath);
    if (!(targetFile instanceof TFile)) continue;

    const previousLinkText = getPreviousLinkpath(app, targetFile);
    if (!previousLinkText) continue;

    // Add only if the `previous` field points to the current note.
    if (previousLinkText === file.basename || previousLinkText === currentPath) {
      nextNotes.push(targetFile);
    }
  }

  return nextNotes;
}

export async function findLastNote(app: App, startNote: TFile, placeholder: string = "Select the next branch..."): Promise<TFile | null> {
  const reverseCache = buildReverseCache(app);
  let lastNote = startNote;

  while (true) {
    const nextNotes = getNextNotesWithCache(app, lastNote, reverseCache);
    if (nextNotes.length === 0 || nextNotes.includes(startNote)) {
      break;
    }

    if (nextNotes.length === 1) {
      // If only one next note exists, follow it.
      lastNote = nextNotes[0];
    } else {
      // If multiple candidates exist, open a suggestion modal.
      const selectedNote = await new Promise<TFile | null>((resolve) => {
        new NextNoteSuggestModal(app, nextNotes, resolve, placeholder).open();
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

export function findFirstNote(app: App, startNote: TFile): TFile {
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

/**
 * Checks if `target` is an ancestor of `note` by following the `previous` links.
 * 
 * @param app - The Obsidian App instance.
 * @param note - The starting note.
 * @param target - The potential ancestor note.
 * @returns true if `target` is an ancestor of `note`, false otherwise.
 */
export function isAncestor(app: App, note: TFile, target: TFile): boolean {
  let current = note;
  const visited = new Set<string>();
  visited.add(current.path);

  // Limit iteration to prevent infinite loops in case of cycles (though visited set handles it)
  // A reasonable limit for depth
  let depth = 0;
  const maxDepth = 100000; // TODO: Is this limit necessary?

  while (depth < maxDepth) {
    const prev = getPreviousNote(app, current);
    if (!prev) {
      return false;
    }

    if (prev.path === target.path) {
      return true;
    }

    if (visited.has(prev.path)) {
      return false; // Cycle detected
    }

    visited.add(prev.path);
    current = prev;
    depth++;
  }

  return false;
}

/**
 * Checks if two notes are on the same path (i.e., one is an ancestor of the other).
 * 
 * @param app - The Obsidian App instance.
 * @param note1 - The first note.
 * @param note2 - The second note.
 * @returns true if they are on the same path, false otherwise.
 */
export function isOnSamePath(app: App, note1: TFile, note2: TFile): boolean {
  if (note1.path === note2.path) {
    return true;
  }
  return isAncestor(app, note1, note2) || isAncestor(app, note2, note1);
}
