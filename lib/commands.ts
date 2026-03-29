import { App, TFile, Notice } from "obsidian";
import { ConfirmModal } from "./ConfirmModal";
import { NextNoteSuggestModal } from "./NextNoteSuggestModal";
import { getActiveFile, getPreviousNote, getNextNotes, getNextNotesWithCache, buildReverseCache, detachNote, setPreviousProperty, findLastNote, findFirstNote, isOnSamePath } from "./obsidian";
import { CanvasData, CanvasEdge, CanvasNode, randomId } from "./canvas";

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

    const firstNote = findFirstNote(app, file);
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

export function detachNoteCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    new ConfirmModal(
        app,
        "Detach Note",
        `Are you sure you want to detach "${file.basename}" from the chain?`,
        () => {
            void detachNote(app, file, { showNotification: true });
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
    const firstNote = findFirstNote(app, selectedNote);

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

export async function copyNextNotesListCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    interface NodeMeta {
        file: TFile;
        depth: number;
        isCycle: boolean;
    }

    const nodes: NodeMeta[] = [];
    const visited = new Set<string>();
    let hasBranches = false;

    const reverseCache = buildReverseCache(app);

    function dfs(current: TFile, depth: number) {
        if (visited.has(current.path)) {
            return;
        }
        
        visited.add(current.path);
        const nodeMeta: NodeMeta = { file: current, depth, isCycle: false };
        nodes.push(nodeMeta);

        const nextNotes = getNextNotesWithCache(app, current, reverseCache);
        if (nextNotes.length > 1) {
            hasBranches = true;
        }

        for (const nextNote of nextNotes) {
            if (visited.has(nextNote.path)) {
                nodeMeta.isCycle = true;
                continue;
            }
            dfs(nextNote, depth + 1);
        }
    }

    dfs(file, 0);

    const list = nodes.map(node => {
        const indent = hasBranches ? "\t".repeat(node.depth) : "";
        const suffix = node.isCycle ? " 🔄" : "";
        return `${indent}- [[${node.file.basename}]]${suffix}`;
    });

    const text = list.join("\n");
    await navigator.clipboard.writeText(text);
    new Notice(hasBranches ? "Copied next notes tree to clipboard." : "Copied next notes list to clipboard.");
}

class CanvasGenerator {
    nodes: CanvasNode[] = [];
    edges: CanvasEdge[] = [];
    fileToNodeId = new Map<string, string>();
    maxUsedY = 0;
    MAX_COLUMNS = 5;

    constructor(private app: App, private reverseCache: Record<string, string[]>) {}

    dfs(current: TFile, col: number, y: number, direction: number): string {
        const existingNodeId = this.fileToNodeId.get(current.path);
        if (existingNodeId) {
            return existingNodeId;
        }

        const nodeId = randomId();
        this.fileToNodeId.set(current.path, nodeId);

        this.nodes.push({
            id: nodeId,
            type: "file",
            file: current.path,
            x: col * 500,
            y: y,
            width: 400,
            height: 500
        });

        if (y > this.maxUsedY) {
            this.maxUsedY = y;
        }

        const nextNotes = getNextNotesWithCache(this.app, current, this.reverseCache);
        let first = true;
        for (const nextNote of nextNotes) {
            let nextCol = col + direction;
            let nextY = y;
            let nextDir = direction;

            if (first) {
                first = false;
            } else {
                this.maxUsedY += 600;
                nextY = this.maxUsedY;
            }

            if (nextCol >= this.MAX_COLUMNS) {
                nextCol = this.MAX_COLUMNS - 1;
                nextY += 600;
                nextDir = -1;
                if (nextY > this.maxUsedY) this.maxUsedY = nextY;
            } else if (nextCol < 0) {
                nextCol = 0;
                nextY += 600;
                nextDir = 1;
                if (nextY > this.maxUsedY) this.maxUsedY = nextY;
            }

            let fromSide: CanvasEdge["fromSide"] = direction === 1 ? "right" : "left";
            let toSide: CanvasEdge["toSide"] = direction === 1 ? "left" : "right";

            if (nextCol === col) {
                fromSide = "bottom";
                toSide = "top";
            }

            const childId = this.dfs(nextNote, nextCol, nextY, nextDir);
            this.edges.push({
                id: randomId(),
                fromNode: nodeId,
                fromSide: fromSide,
                toNode: childId,
                toSide: toSide
            });
        }

        return nodeId;
    }
}

async function saveCanvasData(app: App, nodes: CanvasNode[], edges: CanvasEdge[], preferredName: string, saveDir: string) {
    const canvasData: CanvasData = { nodes, edges };
    const canvasJson = JSON.stringify(canvasData, null, 2);

    let canvasPath = preferredName;
    if (saveDir && saveDir !== '/') {
        canvasPath = `${saveDir}/${canvasPath}`;
    }

    let finalPath = canvasPath;
    let increment = 0;
    while (app.vault.getAbstractFileByPath(finalPath)) {
        increment++;
        finalPath = canvasPath.replace('.canvas', ` ${increment}.canvas`);
    }

    const newCanvasFile = await app.vault.create(finalPath, canvasJson);
    await app.workspace.getLeaf().openFile(newCanvasFile);
    new Notice(`Created canvas: ${newCanvasFile.basename}`);
}

export async function exportNextNotesToCanvasCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    const reverseCache = buildReverseCache(app);
    const generator = new CanvasGenerator(app, reverseCache);

    generator.dfs(file, 0, 0, 1);

    const canvasName = `${file.basename} - Next Notes.canvas`;
    const saveDir = file.parent && file.parent.path !== '/' ? file.parent.path : "/";
    await saveCanvasData(app, generator.nodes, generator.edges, canvasName, saveDir);
}

async function generateAllRiversCanvas(app: App) {
    const allFiles = app.vault.getMarkdownFiles();
    const reverseCache = buildReverseCache(app);
    const generator = new CanvasGenerator(app, reverseCache);
    
    let currentY = 0;
    
    for (const file of allFiles) {
        if (generator.fileToNodeId.has(file.path)) continue;

        const prev = getPreviousNote(app, file);
        if (!prev) {
            const nexts = getNextNotesWithCache(app, file, reverseCache);
            if (nexts.length > 0) {
                generator.dfs(file, 0, currentY, 1);
                currentY = generator.maxUsedY + 1000;
            }
        }
    }

    for (const file of allFiles) {
        if (generator.fileToNodeId.has(file.path)) continue;

        const prev = getPreviousNote(app, file);
        if (prev) {
            generator.dfs(file, 0, currentY, 1);
            currentY = generator.maxUsedY + 1000;
        }
    }

    if (generator.nodes.length === 0) {
        new Notice("No connected notes found in the vault.");
        return;
    }

    await saveCanvasData(app, generator.nodes, generator.edges, "All Connected Notes.canvas", "/");
}

export function exportAllRiversToCanvasCommand(app: App) {
    new ConfirmModal(
        app,
        "Export All Connected Notes",
        "This command will scan your entire vault to find all connected notes and plot them to a Canvas. It may take some time if your vault is large. Do you want to proceed?",
        () => {
            void generateAllRiversCanvas(app);
        }
    ).open();
}
