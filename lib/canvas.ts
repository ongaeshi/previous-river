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
