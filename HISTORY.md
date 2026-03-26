# History

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