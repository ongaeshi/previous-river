import { App, TFile, Notice } from "obsidian";
import { ConfirmModal } from "./ConfirmModal";
import { NextNoteSuggestModal } from "./NextNoteSuggestModal";
import { getActiveFile, getPreviousNote, getNextNotes, detachNote, setPreviousProperty, findLastNote, findFirstNote, isOnSamePath } from "./obsidian";

export async function goToPreviousNoteCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    const target = getPreviousNote(app, file);
    if (!target) {
        return;
    }

    await app.workspace.getLeaf().openFile(target);
}

export async function goToNextNoteCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    const nextNotes = getNextNotes(app, file);

    if (nextNotes.length === 0) {
        return;
    }

    if (nextNotes.length === 1) {
        // If only one candidate exists, open it directly.
        await app.workspace.getLeaf().openFile(nextNotes[0]);
    } else {
        // If multiple candidates exist, open a suggestion modal.
        new NextNoteSuggestModal(app, nextNotes, (selectedFile) => {
            void app.workspace.getLeaf().openFile(selectedFile);
        }, "Select next note...").open();
    }
}

export async function goToFirstNoteCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    const firstNote = await findFirstNote(app, file);
    if (firstNote !== file) {
        await app.workspace.getLeaf().openFile(firstNote);
    }
}

export async function goToLastNoteCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    const lastNote = await findLastNote(app, file, "Select the next branch to reach the last note...");
    if (lastNote && lastNote !== file) {
        await app.workspace.getLeaf().openFile(lastNote);
    }
}

export async function detachNoteCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    new ConfirmModal(
        app,
        "Detach Note",
        `Are you sure you want to detach "${file.basename}" from the chain?`,
        async () => {
            await detachNote(app, file, { showNotification: true });
        }
    ).open();
}

export async function insertNoteToLastCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    const selectedNote = await new Promise<TFile | null>((resolve) => {
        new NextNoteSuggestModal(app, getSortedMarkdownFiles(app), resolve, "Select target note...").open();
    });

    if (!selectedNote) {
        return;
    }

    if (isOnSamePath(app, file, selectedNote)) {
        new Notice(`Cannot insert: "${file.basename}" and "${selectedNote.basename}" are on the same path.`);
        return;
    }

    const lastNote = await findLastNote(app, selectedNote, "Select the next branch of the target note...");
    if (!lastNote) {
        return;
    }

    await setPreviousProperty(app, file, lastNote.basename);
    new Notice(`Inserted note to last: ${lastNote.basename}`);
}

export async function insertNoteCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    // 1. Select target note
    const selectedNote = await new Promise<TFile | null>((resolve) => {
        // Show all markdown files
        new NextNoteSuggestModal(app, getSortedMarkdownFiles(app), resolve, "Select target note...").open();
    });

    if (!selectedNote) {
        return;
    }

    // 2. Check if the notes are on the same path
    if (isOnSamePath(app, file, selectedNote)) {
        new Notice(`Cannot insert: "${file.basename}" and "${selectedNote.basename}" are on the same path.`);
        return;
    }

    // 3. Find successors of the target note (notes that currently point to target)
    const successors = getNextNotes(app, selectedNote);

    let targetNextNote: TFile | null = null;
    if (successors.length === 1) {
        targetNextNote = successors[0];
    } else if (successors.length > 1) {
        targetNextNote = await new Promise<TFile | null>((resolve) => {
            new NextNoteSuggestModal(app, successors, resolve, "Select successor of the target note...").open();
        });
        if (!targetNextNote) {
            return; // cancelled
        }
    }

    // 4. Find the last note of the current chain
    // findLastNote automatically prompts if there are branches
    const sourceLastNote = await findLastNote(app, file, "Select the next branch of the current note...");
    if (!sourceLastNote) {
        return; // cancelled
    }

    // 5. Link current note to target
    await setPreviousProperty(app, file, selectedNote.basename);

    // 6. Update targetNextNote to point to the current chain's last note
    if (targetNextNote) {
        await setPreviousProperty(app, targetNextNote, sourceLastNote.basename);
        new Notice(`Inserted note between ${selectedNote.basename} and ${targetNextNote.basename}`);
    } else {
        new Notice(`Inserted note after ${selectedNote.basename}`);
    }
}

export async function insertNoteToFirstCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    // 1. Select target note
    const selectedNote = await new Promise<TFile | null>((resolve) => {
        new NextNoteSuggestModal(app, getSortedMarkdownFiles(app), resolve, "Select target note...").open();
    });

    if (!selectedNote) {
        return;
    }

    // 2. Check for cycles
    if (isOnSamePath(app, file, selectedNote)) {
        new Notice(`Cannot insert: "${file.basename}" and "${selectedNote.basename}" are on the same path.`);
        return;
    }

    // 3. Find first note of the target chain
    const firstNote = await findFirstNote(app, selectedNote);

    // 4. Find the last note of the current chain
    const lastNoteOfCurrent = await findLastNote(app, file, "Select the next branch of the current note...");

    // 5. Update target's first note to point to the current chain's last note
    if (lastNoteOfCurrent) {
        await setPreviousProperty(app, firstNote, lastNoteOfCurrent.basename);
        new Notice(`Inserted note before ${firstNote.basename}`);
    }
}

function getSortedMarkdownFiles(app: App): TFile[] {
    const files = app.vault.getMarkdownFiles();
    const lastOpenFiles = app.workspace.getLastOpenFiles();

    // Create a map for fast lookup of order (lower index = more recent)
    const orderMap = new Map<string, number>();
    lastOpenFiles.forEach((path, index) => {
        orderMap.set(path, index);
    });

    return files.sort((a, b) => {
        const orderA = orderMap.has(a.path) ? orderMap.get(a.path)! : Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.has(b.path) ? orderMap.get(b.path)! : Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        // Fallback to alphabetical order for files not in history
        return a.basename.localeCompare(b.basename);
    });
}
