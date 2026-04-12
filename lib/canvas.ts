import { App, Notice, TFile } from "obsidian";
import { getNextNotesWithCache } from "./obsidian";

export interface CanvasNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: "file";
    file: string;
}

export interface CanvasEdge {
    id: string;
    fromNode: string;
    fromSide: "top" | "right" | "bottom" | "left";
    toNode: string;
    toSide: "top" | "right" | "bottom" | "left";
}

export interface CanvasData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

export function randomId(): string {
    return Math.random().toString(36).substring(2, 18);
}

export class CanvasGenerator {
    nodes: CanvasNode[] = [];
    edges: CanvasEdge[] = [];
    fileToNodeId = new Map<string, string>();
    maxUsedY = 0;
    MAX_COLUMNS = 5;

    constructor(private app: App, private reverseCache: Record<string, string[]>) { }

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
            let nextCol = col + 1; // Always progress left to right
            let nextY = y;

            if (first) {
                first = false;
            } else {
                this.maxUsedY += 600;
                nextY = this.maxUsedY;
            }

            let isWrapped = false;
            if (nextCol >= this.MAX_COLUMNS) {
                nextCol = 0;
                nextY += 600;
                if (nextY > this.maxUsedY) this.maxUsedY = nextY;
                isWrapped = true;
            }

            let isLoop = this.fileToNodeId.has(nextNote.path);

            let fromSide: CanvasEdge["fromSide"] = "right";
            let toSide: CanvasEdge["toSide"] = "left";

            if (nextCol === col) {
                fromSide = "bottom";
                toSide = "top";
            } else if (isWrapped) {
                fromSide = "bottom";
                toSide = "top";
            } else if (isLoop) {
                fromSide = "top";
                toSide = "top";
            }

            const childId = this.dfs(nextNote, nextCol, nextY, 1);
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

export async function saveCanvasData(app: App, nodes: CanvasNode[], edges: CanvasEdge[], preferredName: string, saveDir: string) {
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
