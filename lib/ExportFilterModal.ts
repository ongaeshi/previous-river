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

let lastExportFilterResult: ExportFilterResult | null = null;

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
        if (lastExportFilterResult) {
            this.directory = lastExportFilterResult.directory;
            this.tag = lastExportFilterResult.tag;
            this.link = lastExportFilterResult.link;
            this.property = lastExportFilterResult.property;
            this.width = lastExportFilterResult.width;
            this.height = lastExportFilterResult.height;
            this.maxColumns = lastExportFilterResult.maxColumns;
            this.exportAll = lastExportFilterResult.exportAll;
        } else {
            this.directory = '';
            this.tag = '';
            this.link = '';
            this.property = '';
            this.width = '400';
            this.height = '500';
            this.maxColumns = '5';
            this.exportAll = false;
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Export Connected Notes by Filter" });

        const dirSetting = new Setting(contentEl)
            .setName("Directory")
            .setDesc("Export notes under this directory (e.g., 01_Projects)")
            .addText(text => text
                .setValue(this.directory)
                .onChange(value => this.directory = value));

        const propSetting = new Setting(contentEl)
            .setName("Property")
            .setDesc("Use with Link or Tag: Only search in this property")
            .addText(text => text
                .setValue(this.property)
                .onChange(value => this.property = value));

        const linkSetting = new Setting(contentEl)
            .setName("Link")
            .setDesc("Export notes containing this link (e.g., Some Concept)")
            .addText(text => text
                .setValue(this.link)
                .onChange(value => this.link = value));

        const tagSetting = new Setting(contentEl)
            .setName("Tag")
            .setDesc("Export notes containing this tag (e.g., #idea)")
            .addText(text => text
                .setValue(this.tag)
                .onChange(value => this.tag = value));

        new Setting(contentEl)
            .setName("Search all elements")
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

        // Apply initial disabled state based on this.exportAll
        if (this.exportAll) {
            dirSetting.setDisabled(true);
            tagSetting.setDisabled(true);
            linkSetting.setDisabled(true);
            propSetting.setDisabled(true);
        }

        new Setting(contentEl)
            .setName("Width")
            .setDesc("Default: 400")
            .addText(text => text
                .setValue(this.width)
                .onChange(value => this.width = value));

        new Setting(contentEl)
            .setName("Height")
            .setDesc("Default: 500")
            .addText(text => text
                .setValue(this.height)
                .onChange(value => this.height = value));

        new Setting(contentEl)
            .setName("Max Columns")
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
                    const result: ExportFilterResult = {
                        directory: this.directory,
                        tag: this.tag,
                        link: this.link,
                        property: this.property,
                        width: this.width,
                        height: this.height,
                        maxColumns: this.maxColumns,
                        exportAll: this.exportAll
                    };
                    lastExportFilterResult = result;
                    this.onSubmit(result);
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
