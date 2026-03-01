# Previous River

An Obsidian plugin that enables navigation between notes using the `previous` property in frontmatter or backlinks.

<img width="640" src="https://github.com/user-attachments/assets/db3d5466-affd-43de-aebe-b5d4757e08ac" />

## Features

### Go to previous note
Jump to the note specified in the `previous` property of the current note's frontmatter.

### Go to next note
Move to notes that backlink to the current note and have their `previous` property pointing to it.  
If multiple candidates exist, a suggestion modal will allow you to choose.

### Go to first note
Follow the `previous` property chain to reach the first note in the sequence.

### Go to last note
Use backlinks to find the last note in the sequence.  
If there are multiple candidates, a suggestion modal will appear for selection.

### Insert notes
Insert notes into the current backlink sequence.
- **Insert Note**: Insert the selected note into the sequence.
- **Insert Note to First**: Insert the selected note at the beginning of the sequence.
- **Insert Note to Last**: Insert the selected note at the end of the sequence.

### Detach note
Detach the current note from the sequence by setting its `previous` property to `ROOT`.

## Recommended Hotkeys

- **Go to previous note**: `Alt+,`
- **Go to next note**: `Alt+.`
- **Go to first note**: `Alt+Shift+,`
- **Go to last note**: `Alt+Shift+.`

## Contributing

Feel free to submit bug reports and feature requests via Issues. Contributions through pull requests are also highly appreciated!