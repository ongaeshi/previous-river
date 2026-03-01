# History

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