import { App, Modal, Setting } from "obsidian";

export interface ExportFilterResult {
    directory: string;
    tag: string;
    link: string;
    property: string;
}

export class ExportFilterModal extends Modal {
    directory: string;
    tag: string;
    link: string;
    property: string;
    onSubmit: (result: ExportFilterResult) => void;

    constructor(app: App, onSubmit: (result: ExportFilterResult) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.directory = '';
        this.tag = '';
        this.link = '';
        this.property = '';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Export Connected Notes by Filter" });

        new Setting(contentEl)
            .setName("Directory")
            .setDesc("Export notes under this directory (e.g., 01_Projects)")
            .addText(text => text
                .onChange(value => this.directory = value));

        new Setting(contentEl)
            .setName("Tag")
            .setDesc("Export notes containing this tag (e.g., #idea)")
            .addText(text => text
                .onChange(value => this.tag = value));

        new Setting(contentEl)
            .setName("Link")
            .setDesc("Export notes containing this link (e.g., Some Concept)")
            .addText(text => text
                .onChange(value => this.link = value));

        new Setting(contentEl)
            .setName("Property")
            .setDesc("Use with Link: Only search links in this property")
            .addText(text => text
                .onChange(value => this.property = value));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText("Export")
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit({ directory: this.directory, tag: this.tag, link: this.link, property: this.property });
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
