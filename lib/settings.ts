import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import PreviousRiverPlugin from "../main";
import { FolderSuggest } from "./FolderSuggest";

export interface MyPluginSettings {
    enableDailyNoteNav: boolean;
    dailyNoteFormat: string;
    dailyFolder: string;

    enableWeeklyNoteNav: boolean;
    weeklyNoteFormat: string;
    weeklyFolder: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    enableDailyNoteNav: true,
    dailyNoteFormat: 'YYYY-MM-DD',
    dailyFolder: '/',

    enableWeeklyNoteNav: true,
    weeklyNoteFormat: 'gggg-[W]ww',
    weeklyFolder: '/'
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

        // TODO setting to import setting from other plugin like daily notes, calendar, periodic notes

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
                this.plugin.settings.dailyNoteFormat = value || DEFAULT_SETTINGS.dailyNoteFormat;  
                await this.plugin.saveSettings();  
        }));

        // this hanlde edge case of daily note of same file name in different folders
        // TODO provide autocomplete like the calendar plugin
        new Setting(containerEl)
            .setName('Daily Notes folder')
            .setDesc("Enter the folder that contains your daily notes, use '/' if the root folder contains your daily notes")
            .addText((text) => {
                text
                .setPlaceholder('Personal/Daily Notes')
                .setValue(this.plugin.settings.dailyFolder)
                .onChange(async (value)=> {
                    this.plugin.settings.dailyFolder = value;
                    await this.plugin.saveSettings();
                })
            });

        // settings to enable implicit navigation of weekly notes
        new Setting(containerEl)
            .setName('Weekly Notes Settings')
            .setHeading();

        new Setting(containerEl)  
            .setName('Navigate between Weekly Notes')
            .setDesc("When enabled, you can navigate between weekly notes using the commands even if the weekly notes don't have 'previous' properties.")  
            .addToggle(toggle => toggle  
            .setValue(this.plugin.settings.enableWeeklyNoteNav)  
            .onChange(async (value) => {  
                this.plugin.settings.enableWeeklyNoteNav = value;  
                await this.plugin.saveSettings();  
                this.display();  
            })  
            );

        const weeklyDateDesc = document.createDocumentFragment();  
        weeklyDateDesc.appendText('For a list of all available tokens, see the ');  
        weeklyDateDesc.createEl('a', {  
            text: 'format reference',  
            attr: { href: 'https://momentjs.com/docs/#/displaying/format/', target: '_blank' }  
        });  
        weeklyDateDesc.createEl('br');  
        weeklyDateDesc.appendText('Your current syntax looks like this: ');  
        const weeklyDateSampleEl = weeklyDateDesc.createEl('b', 'u-pop');  

        new Setting(containerEl)  
            .setName('Weekly Notes format')  
            .setDesc(weeklyDateDesc)  
            .addMomentFormat(momentFormat => momentFormat  
            .setValue(this.plugin.settings.weeklyNoteFormat)  
            .setSampleEl(weeklyDateSampleEl)  
            .setDefaultFormat('gggg-[W]ww')  
            .onChange(async (value) => {  
                this.plugin.settings.weeklyNoteFormat = value || DEFAULT_SETTINGS.weeklyNoteFormat;  
                await this.plugin.saveSettings();  
            }));

        new Setting(containerEl)
            .setName('Weekly Notes folder')
            .setDesc("Enter the folder that contains your weekly notes, use '/' if the root folder contains your weekly notes")
            .addText((text) => {
                text
                .setPlaceholder('Personal/Weekly Notes')
                .setValue(this.plugin.settings.weeklyFolder)
                .onChange(async (value)=> {
                    this.plugin.settings.weeklyFolder = value;
                    await this.plugin.saveSettings();
                })
            });
        
	}
}
