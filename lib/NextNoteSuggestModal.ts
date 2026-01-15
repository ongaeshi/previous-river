import { SuggestModal, App, TFile } from "obsidian";

export class NextNoteSuggestModal extends SuggestModal<TFile> {
  constructor(app: App, private options: TFile[], private onSelect: (file: TFile) => void) {
    super(app);
  }

  getSuggestions(query: string): TFile[] {
    // query に部分一致するものだけ返す（簡易絞り込み）
    return this.options.filter(file => file.path.toLowerCase().includes(query.toLowerCase()));
  }

  renderSuggestion(file: TFile, el: HTMLElement) {
    el.createEl("div", { text: file.path.endsWith(".md") ? file.path.slice(0, -3) : file.path });
  }

  onChooseSuggestion(file: TFile, evt: MouseEvent | KeyboardEvent) {
    this.onSelect(file);
  }
}
