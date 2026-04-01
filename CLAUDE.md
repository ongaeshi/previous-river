# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run check        # TypeScript type checking (no emit)
npm run build        # Production build → build/main.js, then copies to live vault
npm run zip          # Package main.js + manifest.json into a zip for release
eslint main.ts       # Lint a file (requires global eslint: npm install -g eslint)
eslint ./lib/        # Lint all files in a folder
```

`npm run build` runs esbuild then `npm run copy`, which copies `build/main.js` and `manifest.json` directly into the developer's live Obsidian vault for manual testing. There is no automated test suite.

## Architecture

This is an **Obsidian community plugin** that enables sequential note navigation using the `previous` YAML frontmatter property and backlink relationships, with optional implicit navigation for periodic (daily/weekly) notes.

**Source files:**

- `main.ts` — Plugin entry point. Registers 8 commands and the settings tab on `onload`. Should remain minimal.
- `lib/commands.ts` — Command implementations: `go-to-previous-note`, `go-to-next-note`, `go-to-first-note`, `go-to-last-note`, `detach-note`, `insert-note`, `insert-note-to-first`, `insert-note-to-last`.
- `lib/obsidian.ts` — All core logic: `getPreviousNote()`, `getNextNotes()`, `findFirstNote()`, `findLastNote()`, `detachNote()`, `setPreviousProperty()`. Also contains periodic note helpers.
- `lib/settings.ts` — `MyPluginSettings` interface, `DEFAULT_SETTINGS`, and `MySettingTab` (the plugin's settings UI). Settings cover daily and weekly note navigation (enable toggle, date format, folder path).
- `lib/NextNoteSuggestModal.ts` — Extends `SuggestModal`. Used both when navigating to a branching next note and when picking a target note for insert commands.
- `lib/ConfirmModal.ts` — Simple confirmation dialog, used by `detach-note`.
- `lib/utils.ts` — `extractLinktext()` parses wiki-links; `formatFolderPath()` normalises folder path input from settings.

**Navigation logic:**

- *Previous/Next*: follow `previous` frontmatter wikilink, or implicitly navigate between periodic notes if enabled and the file matches the configured format+folder.
- *First/Last*: traverse the full chain with loop detection; prompts via modal when a branch is encountered.
- *Detach*: removes the current note from the chain by re-linking its predecessor and successor(s) directly, then clears its own `previous` property.
- *Insert*: positions the current note at an arbitrary point in a chain by detaching it first, then re-wiring the surrounding notes.
- `"ROOT"` is the sentinel value written to `previous` when a note becomes the first in a chain with no predecessor.

**Obsidian API patterns used:** `app.metadataCache` for frontmatter and backlink resolution (`resolvedLinks`); `app.fileManager.processFrontMatter()` for safe frontmatter writes; `moment` (re-exported by Obsidian) for date parsing in periodic note logic.

## Key constraints

- Bundle target is `es2020` CJS via esbuild; the `obsidian` package is external (never bundled).
- `isDesktopOnly: false` — avoid Node/Electron-only APIs.
- Command IDs must never be renamed after release (users may have hotkeys bound to them).
- Use `this.register*` helpers (`registerEvent`, `registerDomEvent`, `registerInterval`) for all listeners so they are cleaned up on unload.
- Versioning: bump `version` in `manifest.json` (SemVer, no leading `v`), update `versions.json`, then create a matching GitHub release with `main.js` and `manifest.json` as assets.
