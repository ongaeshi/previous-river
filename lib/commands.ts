import { App, TFile, Notice } from "obsidian";
import { ConfirmModal } from "./ConfirmModal";
import { NextNoteSuggestModal } from "./NextNoteSuggestModal";
import { getActiveFile, getPreviousNote, getNextNotes, getNextNotesWithCache, buildReverseCache, detachNote, setPreviousProperty, findLastNote, findFirstNote, isOnSamePath } from "./obsidian";
import { CanvasGenerator, saveCanvasData } from "./canvas";
import { ExportFilterModal } from "./ExportFilterModal";

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



export async function exportNextNotesToCanvasCommand(app: App) {
    const file = getActiveFile(app);
    if (!file) {
        return;
    }

    const reverseCache = buildReverseCache(app);
    const generator = new CanvasGenerator(app, reverseCache);

    generator.dfs(file, 0, 0, 1);

    const canvasName = `${file.basename} - Next Notes.canvas`;
    const saveDir = app.fileManager.getNewFileParent(file.path, file.basename + ".md").path;
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

    const activeFile = getActiveFile(app);
    const sourcePath = activeFile ? activeFile.path : "";
    const canvasName = "All Connected Notes.canvas";
    
    // 拡張子が .canvas だとアタッチメントフォルダ等に振り分けられるのを防ぐため、
    // 第2引数は .md として判定させ、「新規ファイルの置き場所」を参照させます
    const saveDir = app.fileManager.getNewFileParent(sourcePath, "All Connected Notes.md").path;

    await saveCanvasData(app, generator.nodes, generator.edges, canvasName, saveDir);
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

export function exportFilteredRiversToCanvasCommand(app: App) {
    new ExportFilterModal(app, async (result) => {
        let { directory, tag, link, property, width, height, maxColumns } = result;
        if (!directory && !tag && !link) {
            new Notice("Please provide at least one filter criterion.");
            return;
        }

        tag = tag.trim();
        link = link.trim();
        directory = directory.trim();
        property = property?.trim();

        if (tag && !tag.startsWith("#")) {
            tag = "#" + tag;
        }

        const allFiles = app.vault.getMarkdownFiles();
        const matchedFiles: TFile[] = [];

        for (const file of allFiles) {
            let match = true;

            if (directory && !file.path.includes(directory)) {
                match = false;
            }

            if (match && (tag || link)) {
                const cache = app.metadataCache.getFileCache(file);
                
                if (tag) {
                    const fileTags = cache?.tags?.map(t => t.tag) || [];
                    const frontmatterTagsFromCache = cache?.frontmatter?.tags;
                    
                    let fmTags: string[] = [];
                    if (Array.isArray(frontmatterTagsFromCache)) {
                        fmTags = frontmatterTagsFromCache;
                    } else if (typeof frontmatterTagsFromCache === 'string') {
                        fmTags = frontmatterTagsFromCache.split(",").map(t => t.trim());
                    }

                    const allTags = [...fileTags, ...fmTags.map(t => t.startsWith("#") ? t : "#" + t)];

                    const hasTag = allTags.some(t => t === tag || t.startsWith(tag + "/"));
                    if (!hasTag) match = false;
                }

                if (match && link) {
                    if (property) {
                        const fileFrontmatterLinks = cache?.frontmatterLinks?.filter(l => l.key === property) || [];
                        const hasLink = fileFrontmatterLinks.some(l => l.link.includes(link));
                        if (!hasLink) match = false;
                    } else {
                        const fileLinks = cache?.links?.map(l => l.link) || [];
                        const fileEmbeds = cache?.embeds?.map(e => e.link) || [];
                        const fileFrontmatterLinks = cache?.frontmatterLinks?.map(l => l.link) || [];
                        const allLinks = [...fileLinks, ...fileEmbeds, ...fileFrontmatterLinks];
                        const hasLink = allLinks.some(l => l.includes(link));
                        if (!hasLink) match = false;
                    }
                }
            }

            if (match) {
                matchedFiles.push(file);
            }
        }

        if (matchedFiles.length === 0) {
            new Notice("No files matched the given criteria.");
            return;
        }

        const roots = new Set<TFile>();
        for (const file of matchedFiles) {
            const root = findFirstNote(app, file);
            roots.add(root);
        }

        const reverseCache = buildReverseCache(app);
        
        const numWidth = parseInt(width);
        const numHeight = parseInt(height);
        const numMaxColumns = parseInt(maxColumns);
        
        const generatorOptions = {
            width: isNaN(numWidth) ? 400 : numWidth,
            height: isNaN(numHeight) ? 500 : numHeight,
            maxColumns: isNaN(numMaxColumns) ? 5 : numMaxColumns
        };
        
        const generator = new CanvasGenerator(app, reverseCache, generatorOptions);
        let currentY = 0;

        for (const root of roots) {
            if (generator.fileToNodeId.has(root.path)) continue;
            
            generator.dfs(root, 0, currentY, 1);
            currentY = generator.maxUsedY + 1000;
        }
        
        if (generator.nodes.length === 0) {
             new Notice("No connected notes found for the matched files.");
             return;
        }

        const activeFile = getActiveFile(app);
        const sourcePath = activeFile ? activeFile.path : "";
        const canvasName = "Filtered Connected Notes.canvas";
        const saveDir = app.fileManager.getNewFileParent(sourcePath, "Filtered Connected Notes.md").path;

        await saveCanvasData(app, generator.nodes, generator.edges, canvasName, saveDir);

    }).open();
}
