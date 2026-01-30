import {App, PluginSettingTab, Setting} from "obsidian";
import PreviousRiverPlugin from "../main";

export interface MyPluginSettings {
    enableDailyNoteNav: boolean;
    dailyNoteFormat: string;
    enableWeeklyNoteNav: boolean;
    weeklyNoteFormat: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    enableDailyNoteNav: true,
    dailyNoteFormat: 'YYYY-MM-DD',
    enableWeeklyNoteNav: true,
    weeklyNoteFormat: 'gggg-[W]ww'
}

export class MySettingTab extends PluginSettingTab {
	plugin: PreviousRiverPlugin;

	constructor(app: App, plugin: PreviousRiverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

        // settings to enable implicit navigation of daily notes
        new Setting(containerEl)
            .setName('Daily Notes Settings')
            .setHeading();

        new Setting(containerEl)  
            .setName('Navigate between Daily Notes')
            .setDesc("When enabled, you can navigate between daily notes using the commands even if the daily notes don't have 'previous' properties.")  
            .addToggle(toggle => toggle  
            .setValue(this.plugin.settings.enableDailyNoteNav)  
            .onChange(async (value) => {  
                this.plugin.settings.enableDailyNoteNav = value;  
                await this.plugin.saveSettings();  
                this.display();  
            })  
            );

        // TODO setting to import setting from other plugin

        const dateDesc = document.createDocumentFragment();  
        dateDesc.appendText('For a list of all available tokens, see the ');  
        dateDesc.createEl('a', {  
            text: 'format reference',  
            attr: { href: 'https://momentjs.com/docs/#/displaying/format/', target: '_blank' }  
        });  
        dateDesc.createEl('br');  
        dateDesc.appendText('Your current syntax looks like this: ');  
        const dateSampleEl = dateDesc.createEl('b', 'u-pop');  
        new Setting(containerEl)  
            .setName('Daily Notes format')  
            .setDesc(dateDesc)  
            .addMomentFormat(momentFormat => momentFormat  
            .setValue(this.plugin.settings.dailyNoteFormat)  
            .setSampleEl(dateSampleEl)  
            .setDefaultFormat('YYYY-MM-DD')  
            .onChange(async (value) => {  
                this.plugin.settings.dailyNoteFormat = value;  
                await this.plugin.saveSettings();  
        }));

        // TODO daily note folder setting (hanlde edge case of daily note of same file name in different folders)

        // TODO settings for weekly note
	}
}
