import { App, Modal, Setting } from "obsidian";

export interface ExportFilterResult {
    directory: string;
    tag: string;
    link: string;
    property: string;
    width: string;
    height: string;
    maxColumns: string;
    exportAll: boolean;
}

export class ExportFilterModal extends Modal {
    directory: string;
    tag: string;
    link: string;
    property: string;
    width: string;
    height: string;
    maxColumns: string;
    exportAll: boolean;
    onSubmit: (result: ExportFilterResult) => void;

    constructor(app: App, onSubmit: (result: ExportFilterResult) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.directory = '';
        this.tag = '';
        this.link = '';
        this.property = '';
        this.width = '400';
        this.height = '500';
        this.maxColumns = '5';
        this.exportAll = false;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Export Connected Notes by Filter" });

        const dirSetting = new Setting(contentEl)
            .setName("Directory")
            .setDesc("Export notes under this directory (e.g., 01_Projects)")
            .addText(text => text
                .onChange(value => this.directory = value));

        const tagSetting = new Setting(contentEl)
            .setName("Tag")
            .setDesc("Export notes containing this tag (e.g., #idea)")
            .addText(text => text
                .onChange(value => this.tag = value));

        const linkSetting = new Setting(contentEl)
            .setName("Link")
            .setDesc("Export notes containing this link (e.g., Some Concept)")
            .addText(text => text
                .onChange(value => this.link = value));

        const propSetting = new Setting(contentEl)
            .setName("Property")
            .setDesc("Use with Link: Only search links in this property")
            .addText(text => text
                .onChange(value => this.property = value));

        new Setting(contentEl)
            .setName("Search all elements (すべての要素を探索する)")
            .setDesc("Ignore filters above and export all connected notes")
            .addToggle(toggle => toggle
                .setValue(this.exportAll)
                .onChange(value => {
                    this.exportAll = value;
                    dirSetting.setDisabled(value);
                    tagSetting.setDisabled(value);
                    linkSetting.setDisabled(value);
                    propSetting.setDisabled(value);
                }));

        new Setting(contentEl)
            .setName("Width (横幅)")
            .setDesc("Default: 400")
            .addText(text => text
                .setValue(this.width)
                .onChange(value => this.width = value));

        new Setting(contentEl)
            .setName("Height (縦幅)")
            .setDesc("Default: 500")
            .addText(text => text
                .setValue(this.height)
                .onChange(value => this.height = value));

        new Setting(contentEl)
            .setName("Max Columns (折り返し数)")
            .setDesc("Default: 5")
            .addText(text => text
                .setValue(this.maxColumns)
                .onChange(value => this.maxColumns = value));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText("Export")
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit({ 
                        directory: this.directory, 
                        tag: this.tag, 
                        link: this.link, 
                        property: this.property,
                        width: this.width,
                        height: this.height,
                        maxColumns: this.maxColumns,
                        exportAll: this.exportAll
                    });
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
