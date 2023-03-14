import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

import * as pseudocode from "pseudocode";

// Remember to rename these classes and interfaces!

interface PseudocodeSettings {
	indentSize: string;
	commentDelimiter: string;
	lineNumber: boolean;
	lineNumberPunc: string;
	noEnd: boolean;
	captionCount: undefined;
}

const DEFAULT_SETTINGS: PseudocodeSettings = {
	indentSize: "1.2em",
	commentDelimiter: "//",
	lineNumber: false,
	lineNumberPunc: ":",
	noEnd: false,
	captionCount: undefined,
};

export default class PseudocodePlugin extends Plugin {
	settings: PseudocodeSettings;

	async pseudocodeHandler(
		source: string,
		el: HTMLElement,
		ctx: any
	): Promise<any> {
		// const rawRows: string[] = source.split("\n");

		const katex = el.createEl("script");
		katex.src =
			"https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.11.1/katex.min.js";
		katex.integrity = "sha256-F/Xda58SPdcUCr+xhSGz9MA2zQBPb0ASEYKohl8UCHc=";
		katex.crossOrigin = "anonymous";

		const preEl = el.createEl("pre", { cls: "code", text: source });

		// console.log(el);
		pseudocode.renderElement(preEl, this.settings);
	}

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor(
			"pcode",
			this.pseudocodeHandler.bind(this)
		);

		// Register suggest
		this.registerEditorSuggest(new PseudocodeSuggestor(this));

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PseudocodeSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		// );
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PseudocodeSettingTab extends PluginSettingTab {
	plugin: PseudocodePlugin;

	constructor(app: App, plugin: PseudocodePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h1", { text: "Pseudocode Plugin Settings" });

		// Instantiate Indent Size setting
		new Setting(containerEl)
			.setName("Indent Size")
			.setDesc(
				"The indent size of inside a control block, e.g. if, for, etc. The unit must be in 'em'."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.indentSize)
					.onChange(async (value) => {
						this.plugin.settings.indentSize = value;
						await this.plugin.saveSettings();
					})
			);

		// Instantiate Comment Delimiter setting
		new Setting(containerEl)
			.setName("Comment Delimiter")
			.setDesc("The string used to indicate a comment in the pseudocode.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.commentDelimiter)
					.onChange(async (value) => {
						this.plugin.settings.commentDelimiter = value;
						await this.plugin.saveSettings();
					})
			);

		// Instantiate Show Line Numbers setting
		new Setting(containerEl)
			.setName("Show Line Numbers")
			.setDesc("Whether line numbering is enabled.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.lineNumber)
					.onChange(async (value) => {
						this.plugin.settings.lineNumber = value;
						await this.plugin.saveSettings();
					})
			);

		// Instantiate Line Number Punctuation setting
		new Setting(containerEl)
			.setName("Line Number Punctuation")
			.setDesc(
				"The punctuation used to separate the line number from the pseudocode."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.lineNumberPunc)
					.onChange(async (value) => {
						this.plugin.settings.lineNumberPunc = value;
						await this.plugin.saveSettings();
					})
			);

		// Instantiate No End setting
		new Setting(containerEl)
			.setName("No End")
			.setDesc(
				"If enabled, pseudocode blocks will not have an 'end' statement."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.noEnd)
					.onChange(async (value) => {
						this.plugin.settings.noEnd = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

class PseudocodeSuggestor extends EditorSuggest<string> {
	plugin: PseudocodePlugin;

	constructor(plugin: PseudocodePlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile
	): EditorSuggestTriggerInfo | null {
		// perf: Use the "\" to tell whether to return.
		const currentLineToCursor = editor
			.getLine(cursor.line)
			.slice(0, cursor.ch);
		const currentLineLastWordStart = currentLineToCursor.lastIndexOf("\\");
		// if there is no word, return null
		if (currentLineLastWordStart === -1) return null;

		const currentFileToCursor = editor.getRange({ line: 0, ch: 0 }, cursor);
		const indexOfLastCodeBlockStart =
			currentFileToCursor.lastIndexOf("```");

		// check if this is a pcode block
		const isPcode =
			currentFileToCursor.slice(
				indexOfLastCodeBlockStart + 3,
				indexOfLastCodeBlockStart + 8
			) == "pcode";

		if (!isPcode) return null;

		// Get last word in current line
		// const currentLineToCursor = editor
		// 	.getLine(cursor.line)
		// 	.slice(0, cursor.ch);

		return {
			start: { line: cursor.line, ch: currentLineLastWordStart },
			end: cursor,
			query: currentLineToCursor.slice(currentLineLastWordStart),
		};
	}

	getSuggestions(
		context: EditorSuggestContext
	): string[] | Promise<string[]> {
		const query = context.query;

		const suggestions = this.pcodeKeywords.filter((value) =>
			value.startsWith(query)
		);

		// console.log(suggestions);
		return suggestions;
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.addClass("suggestion");
		const suggestContent = el.createDiv({ cls: "suggestion-content" });
		suggestContent.setText(value);
	}

	selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
		if (this.context) {
			const editor = this.context.editor;
			const suggestion = value;
			const start = this.context.start;
			const end = editor.getCursor();

			editor.replaceRange(suggestion, start, end);
			const newCursor = end;
			newCursor.ch = start.ch + suggestion.length;

			editor.setCursor(newCursor);

			this.close();
		}
	}

	private pcodeKeywords: string[] = [
		"\\begin{algorithmic}",
		"\\begin{algorithm}",
		"\\end{algorithmic}",
		"\\end{algorithm}",
		"\\caption{}",
		"\\PROCEDURE{}{}",
		"\\ENDPROCEDURE",
		"\\FUNCTION{}{}",
		"\\ENDFUNCTION",
		"\\REQUIRE",
		"\\ENSURE",
		"\\INPUT",
		"\\OUTPUT",
		"\\STATE",
		"\\RETURN",
		"\\PRINT",
		"\\IF{}",
		"\\ELIF{}",
		"\\ENDIF",
		"\\WHILE{}",
		"\\ENDWHILE",
		"\\REPEAT",
		"\\UNTIL{}",
		"\\COMMENT{}",
		"\\{",
		"\\}",
		"\\$",
		"\\&",
		"\\#",
		"\\%",
		"\\_",
		"\\gets",
		"\\CALL{}{}",
		"\\AND",
		"\\OR",
		"\\XOR",
		"\\NOT",
		"\\TO",
		"\\DOWNTO",
		"\\TRUE",
		"\\FALSE",
		"\\tiny",
		"\\scriptsize",
		"\\footnotesize",
		"\\small",
		"\\normalsize",
		"\\large",
		"\\Large",
		"\\LARGE",
		"\\huge",
		"\\HUGE",
		"\\rmfamily",
		"\\sffamily",
		"\\ttfamily",
		"\\upshape",
		"\\itshape",
		"\\slshape",
		"\\scshape",
		"\\bfseries",
		"\\mdseries",
		"\\lfseries",
		"\\textnormal{}",
		"\\textrm{}",
		"\\textsf{}",
		"\\texttt{}",
		"\\textup{}",
		"\\textit{}",
		"\\textsl{}",
		"\\textsc{}",
		"\\uppercase{}",
		"\\lowercase{}",
		"\\textbf{}",
		"\\textmd{}",
		"\\textlf{}",
	];
}
