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
} from "./lib/commands";
import {
	DEFAULT_SETTINGS,
	MyPluginSettings,
	MySettingTab,
} from "./lib/settings";

export default class PreviousRiverPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "go-to-previous-note",
			name: "Go to previous note",
			callback: () => goToPreviousNoteCommand(this.app, this.settings),
		});

		this.addCommand({
			id: "go-to-next-note",
			name: "Go to next note",
			callback: () => goToNextNoteCommand(this.app, this.settings),
		});

		this.addCommand({
			id: "go-to-first-note",
			name: "Go to first note",
			callback: () => goToFirstNoteCommand(this.app, this.settings),
		});

		this.addCommand({
			id: "go-to-last-note",
			name: "Go to last note",
			callback: () => goToLastNoteCommand(this.app, this.settings),
		});

		this.addCommand({
			id: "detach-note",
			name: "Detach note",
			callback: () => detachNoteCommand(this.app, this.settings),
		});

		this.addCommand({
			id: "insert-note-to-last",
			name: "Insert note to last",
			callback: () => insertNoteToLastCommand(this.app, this.settings),
		});

		this.addCommand({
			id: "insert-note",
			name: "Insert note",
			callback: () => insertNoteCommand(this.app, this.settings),
		});

		this.addCommand({
			id: "insert-note-to-first",
			name: "Insert note to first",
			callback: () => insertNoteToFirstCommand(this.app, this.settings),
		});

		this.addSettingTab(new MySettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MyPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
