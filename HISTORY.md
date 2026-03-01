# History

## 0.2.0 (2026-03-02)
- **Insert Note**: Insert the selected note into the sequence.
- **Insert Note to First**: Insert the selected note at the beginning of the sequence.
- **Insert Note to Last**: Insert the selected note at the end of the sequence.
- **Detach Note**: Detaches a note by setting its `previous` property to `ROOT`.

## 0.1.0 (2025-12-01)
- **Go to Previous Note**: Jump to the note specified in the `previous` property of the current note's frontmatter.
- **Go to Next Note**: Move to notes that backlink to the current note and have their `previous` property pointing to it.  
If multiple candidates exist, a suggestion modal will appear for selection.
- **Go to First Note**: Follow the `previous` property chain to reach the first note in the sequence.
- **Go to Last Note**: Use backlinks to find the last note in the sequence.  
If multiple candidates exist, a suggestion modal will appear for selection.