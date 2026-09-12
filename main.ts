import { Plugin } from "obsidian";
import {
  goToPreviousNoteCommand,
  goToNextNoteCommand,
  goToFirstNoteCommand,
  goToLastNoteCommand,
  detachNoteCommand,
  insertNoteToLastCommand,
  insertNoteCommand,
  insertNoteToFirstCommand,
  copyNextNotesListCommand,
  exportNextNotesToCanvasCommand,
  exportAllRiversToCanvasCommand,
  exportFilteredRiversToCanvasCommand,
  setRootCommand,
  setNoteToPreviousPropertyCommand,
  duplicateNextNoteCommand,
  createNextNoteCommand,
  insertBaseNextNotesCommand
} from "./lib/commands";
import { getNextNotes } from "./lib/obsidian";

export default class PreviousRiverPlugin extends Plugin {
  onload() {
    this.addCommand({
      id: "go-to-previous-note",
      name: "Go to previous note",
      callback: () => goToPreviousNoteCommand(this.app),
    });

    this.addCommand({
      id: "go-to-next-note",
      name: "Go to next note",
      callback: () => goToNextNoteCommand(this.app),
    });

    this.addCommand({
      id: "go-to-first-note",
      name: "Go to first note",
      callback: () => goToFirstNoteCommand(this.app),
    });

    this.addCommand({
      id: "go-to-last-note",
      name: "Go to last note",
      callback: () => goToLastNoteCommand(this.app),
    });

    this.addCommand({
      id: "detach-note",
      name: "Detach note",
      callback: () => detachNoteCommand(this.app),
    });

    this.addCommand({
      id: "insert-note-to-last",
      name: "Insert note to last",
      callback: () => insertNoteToLastCommand(this.app),
    });

    this.addCommand({
      id: "insert-note",
      name: "Insert note",
      callback: () => insertNoteCommand(this.app),
    });

    this.addCommand({
      id: "insert-note-to-first",
      name: "Insert note to first",
      callback: () => insertNoteToFirstCommand(this.app),
    });

    this.addCommand({
      id: "copy-next-notes-list",
      name: "Copy next notes list",
      callback: () => copyNextNotesListCommand(this.app),
    });

    this.addCommand({
      id: "export-next-notes-to-canvas",
      name: "Export next notes to canvas",
      callback: () => exportNextNotesToCanvasCommand(this.app),
    });

    this.addCommand({
      id: "export-all-rivers-to-canvas",
      name: "Export all rivers to canvas",
      callback: () => exportAllRiversToCanvasCommand(this.app),
    });

    this.addCommand({
      id: "export-filtered-rivers-to-canvas",
      name: "Export filtered rivers to canvas",
      callback: () => exportFilteredRiversToCanvasCommand(this.app),
    });

    this.addCommand({
      id: "set-root",
      name: "Set ROOT to previous property",
      callback: () => setRootCommand(this.app),
    });

    this.addCommand({
      id: "set-note-to-previous-property",
      name: "Set note to previous property",
      callback: () => setNoteToPreviousPropertyCommand(this.app),
    });

    this.addCommand({
      id: "duplicate-next-note",
      name: "Duplicate next note",
      callback: () => duplicateNextNoteCommand(this.app),
    });

    this.addCommand({
      id: "create-next-note",
      name: "Create next note",
      callback: () => createNextNoteCommand(this.app),
    });

    this.addCommand({
      id: "insert-base-next-notes",
      name: "Insert base to collect next notes",
      editorCallback: (editor, view) => insertBaseNextNotesCommand(this.app, editor, view),
    });

    this.app.workspace.onLayoutReady(() => {
      let timeoutId: number | null = null;
      
      const observer = new MutationObserver(() => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        
        timeoutId = window.setTimeout(() => {
          const activeFile = this.app.workspace.getActiveFile();
          const hasNextNotes = activeFile ? getNextNotes(this.app, activeFile).length > 0 : false;

          const propertiesContainers = document.querySelectorAll('.metadata-properties');
          propertiesContainers.forEach((container) => {
            const properties = container.querySelectorAll('.metadata-property');
            properties.forEach((property) => {
              const keyInput = property.querySelector('.metadata-property-key-input') as HTMLInputElement | null;
              const keyTextEl = property.querySelector('.metadata-property-key');
              
              let keyText = "";
              if (keyInput && keyInput.value) {
                keyText = keyInput.value;
              } else if (keyTextEl && keyTextEl.textContent) {
                keyText = keyTextEl.textContent;
              }

              if (keyText.toLowerCase() === 'previous') {
                const existingButton = property.querySelector('.previous-river-go-next-button');

                if (!hasNextNotes) {
                  if (existingButton) {
                    existingButton.remove();
                  }
                  return;
                }

                if (existingButton) return;

                const button = property.createEl('button', {
                  text: 'next',
                  cls: 'previous-river-go-next-button',
                });

                // Set class to place it on the right side without affecting height
                property.classList.add('previous-river-property-relative');


                button.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToNextNoteCommand(this.app);
                });

                // Simply append to the property container
                property.appendChild(button);
              }
            });
          });
        }, 100); // debounce slightly to avoid performance hit
      });

      observer.observe(document.body, { childList: true, subtree: true });
      this.register(() => observer.disconnect());
    });
  }
}
