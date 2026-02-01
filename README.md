# Previous River

An Obsidian plugin that enables navigation between notes using the `previous` property in frontmatter or backlinks.

<img width="640" src="https://github.com/user-attachments/assets/db3d5466-affd-43de-aebe-b5d4757e08ac" />

## Features

### Go to previous note

Jump to the note specified in the `previous` property of the current note's frontmatter.

### Go to next note

Move to notes that backlink to the current note and have their `previous` property pointing to it.  
If multiple candidates exist, a suggestion modal will allow you to choose.

### Daily/ weekly note navigation

Daily notes and weekly notes are considered to be in sequence even if they don't have `previous` property, so You can navigate to previous daily note, next daily note, previous weekly note and next weekly note.  
You can configure the daily notes and weekly notes settings, such as file format of the daily note.

### Go to first note

Follow the `previous` property chain to reach the first note in the sequence.

### Go to last note

Use backlinks to find the last note in the sequence.  
If there are multiple candidates, a suggestion modal will appear for selection.

## Recommended Hotkeys

- **Go to previous note**: `Alt+,`
- **Go to next note**: `Alt+.`
- **Go to first note**: `Alt+Shift+,`
- **Go to last note**: `Alt+Shift+.`

## Contributing

Feel free to submit bug reports and feature requests via Issues. Contributions through pull requests are also highly appreciated!
