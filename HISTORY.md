# History

## 1.4.0 (2026-09-10)
- **Hierarchical structure support**: Introduced support for hierarchical structures where multiple child notes point to a single parent note via the `previous` property.
- **Insert base to collect next notes**: Added a command to insert a `base` code block into the parent note to dynamically list its child notes.
- **Set note to previous property**: Added a command to set an existing note to the current note's `previous` property.
- **Create next note**: Added a command to create a new empty note and automatically set its `previous` property to the current note. (Note: This command now solely adds a new note. It no longer inserts the note between existing ones. To insert a note, please use the `Insert note` command after creating it.)
- **Duplicate next note**: Updated the behavior to no longer insert the duplicated note between existing ones, aligning with the hierarchical structure support.

## 1.3.0 (2026-05-29)
- **Filtered canvas export**: Add custom filename input for filtered canvas export.
- **Export canvas improvements**: Include notes with an empty `previous` property in exports, and allow exporting isolated notes with a `previous` property to canvas.
- **Bug fix**: Resolve folder paths correctly when retrieving next notes.

## 1.2 (2026-05-17)
- **Documentation**: Rewrote `README.ja.md` to be more clear and concise, and added demo GIFs to showcase plugin features.
- **English README**: Translated `README.ja.md` to English and updated `README.md`.

## 1.1.1 (2026-05-16)
- **Fix ESLint errors**: Replaced inline styles with CSS classes to improve code maintainability and resolve linting warnings.
- **Update minimum app version**: Bumped `minAppVersion` to `1.8.7` to ensure compatibility with recent Obsidian API changes.
- **Release workflow automation**: Added a GitHub Actions workflow to automate the release process and securely sign release assets using Artifact Attestations.

## 1.1.0 (2026-05-14)
- **Next button**: Add a "Next" button to the right side of the `previous` property row within Obsidian's native Properties view.
- **Duplicate next note**: Add a command to duplicate the currently active note and automatically set the new note's `previous` property to point back to the original note.
- **Set ROOT**: Add a command to quickly set the `previous` property of the active file to `ROOT`.
- **Fix floating promise lint error**: Fix a TypeScript linting error in `ExportFilterModal` by explicitly handling an unhandled promise invocation.
- **Translate technical docs**: Translate the Japanese technical documentation (`docs/ja/`) into English.

## 1.0.0 (2026-04-30)
- **Stable Release**: Official 1.0.0 release. 
- **Documentation & Safety**: Finalized and documented the `isAncestor` / `isOnSamePath` safety algorithms that prevent cycle references and protect note graph integrity.

## 0.4.1 (2026-04-26)
- **Export filtered rivers to Canvas**: Add a command to export a customized subset of your note network to an Obsidian Canvas based on specific filters.

## 0.4.0 (2026-04-24)
- **Export next notes to Canvas**: Add a command to export the entire tree structure of next notes derived from the current note to an Obsidian Canvas. Automatically detect loop structures and add a `🔄` icon to the originating note for visualization.
- **Export all previous links to Canvas**: Add a command to analyze all `previous` property connections across the entire vault and export the full network as a Canvas file.
- **Copy next notes list**: Add a command to copy the sequence of next notes to the clipboard. Automatically format the output as a tree-structured text list if branches exist.

## 0.3.0 (2026-03-26)
- **Fast find-last-note**: Significantly improved the performance of finding the last note by building an O(1) reverse cache, eliminating UI freezes in large vaults.
- **Improved next note lookup**: Optimized the speed of finding next notes by using a highly efficient loop over `resolvedLinks`.

## 0.2.1 (2026-03-15)
- Remove redundant async/await.

## 0.2.0 (2026-03-02)
- **Insert note**: Insert the selected note into the sequence.
- **Insert note to first**: Insert the selected note at the beginning of the sequence.
- **Insert note to last**: Insert the selected note at the end of the sequence.
- **Detach note**: Detaches a note by setting its `previous` property to `ROOT`.

## 0.1.0 (2025-12-05)
- **Go to previous note**: Jump to the note specified in the `previous` property of the current note's frontmatter.
- **Go to next note**: Move to notes that backlink to the current note and have their `previous` property pointing to it.  
If multiple candidates exist, a suggestion modal will appear for selection.
- **Go to first note**: Follow the `previous` property chain to reach the first note in the sequence.
- **Go to last note**: Use backlinks to find the last note in the sequence.  
If multiple candidates exist, a suggestion modal will appear for selection.