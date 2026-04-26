# History

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