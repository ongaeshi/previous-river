import { FuzzySuggestModal, App, TFile } from "obsidian";

export class NextNoteSuggestModal extends FuzzySuggestModal<TFile> {
  constructor(app: App, private options: TFile[], private onSelect: (file: TFile) => void, placeholderText?: string) {
    super(app);
    if (placeholderText) {
      this.setPlaceholder(placeholderText);
    }
  }

  getItems(): TFile[] {
    return this.options;
  }

  getItemText(file: TFile): string {
    return file.path.endsWith(".md") ? file.path.slice(0, -3) : file.path;
  }

  onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent) {
    this.onSelect(file);
  }
}
