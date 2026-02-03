import { stringify } from "querystring";

/**
 * Extracts the "linktext" portion from an Obsidian-style wiki link.
 * Removes surrounding [[...]] and strips the alias ("|alias") if present.
 * 
 * Examples:
 *   "[[note]]"               → "note"
 *   "[[note|alias]]"         → "note"
 *   "[[file#heading|alias]]" → "file#heading"
 *   "note"                   → "note"
 */
export function extractLinktext(raw: string): string {
  const trimmed = raw.trim();

  // Remove [[...]] wrapper
  const innerMatch = trimmed.match(/^\[\[([^]*)\]\]$/);
  const inner = innerMatch ? innerMatch[1].trim() : trimmed;

  // Remove alias part (anything after the first "|")
  const [linktext] = inner.split("|");

  return linktext.trim();
}

export function formatFolderPath(path: string): string {
  // 1. Handle empty string
  if (!path) return '/';

  // 2. Handle strings longer than 1 starting with '/'
  if (path.length > 1 && path.startsWith('/')) {
    return path.slice(1);
  }

  // 3. Return as-is (covers single '/' and normal paths)
  return path;
}