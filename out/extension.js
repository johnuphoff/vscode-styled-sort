'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Initializing Awesome 🤘');
    vscode.commands.registerCommand('extension.styled-sort', () => {
        const { activeTextEditor } = vscode.window;
        if (activeTextEditor && activeTextEditor.document.languageId === 'javascript') {
            const { document } = activeTextEditor;
            const regEx = /(styled\..+|css|styled\(.+\))`([^`]+)`/g;
            const text = document.getText();
            let match = [];
            const edits = new vscode.WorkspaceEdit();
            while (match = regEx.exec(text)) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length - 1);
                const range = new vscode.Range(new vscode.Position(startPos.line + 1, 0), endPos);
                if (match.length > 1) {
                    let rules = match[2]
                        .substring(match[2].indexOf('`') + 1)
                        .slice(0, -1)
                        .split('\n')
                        .map((entry) => entry.trim())
                        .filter(function (element) { return element !== ''; });
                    let subquery = '';
                    let subqueryExists = false;
                    let mutableRules = rules.slice(0);
                    for (let i = 0; i < rules.length; i++) {
                        const line = rules[i];
                        // subquery exists when line matches regex
                        if (line.match('^&:')) {
                            subqueryExists = true;
                        }
                        // all subsequent lines are appended to subquery string
                        if (subqueryExists) {
                            subquery += line;
                            mutableRules[i] = '';
                            // until we get to a line that contains a closing brace with no semicolon
                            if (line.match(/[^;{]$/g)) {
                                // save the selector so we can rebuild the formatted string later
                                const selector = subquery.substring(0, subquery.indexOf('{') + 1);
                                // build sorted array of subquery rules
                                const rules = subquery
                                    .split(selector)[1]
                                    .slice(0, -1)
                                    .split(';')
                                    .map((entry) => entry.trim())
                                    .filter(function (element) { return element !== ''; })
                                    .sort();
                                // rebuild the subquery rules using the selector and sorted array
                                let formattedSubqueryRules = `${selector}\n`;
                                rules.map((rule) => {
                                    formattedSubqueryRules += `\t\t${rule};\n`;
                                });
                                formattedSubqueryRules += '\t}';
                                subqueryExists = false;
                                mutableRules.push(formattedSubqueryRules);
                                subquery = '';
                            }
                        }
                    }
                    const filteredRules = mutableRules
                        .filter((element) => {
                        return element !== '';
                    })
                        .sort((a, b) => {
                        return a.replace(/^\W+/, 'z').localeCompare(b.replace(/^\W+/, 'z'));
                    });
                    let formattedRules = '';
                    filteredRules.map((rule, index) => {
                        if (filteredRules[index].match(/^&/g)) {
                            formattedRules += '\n';
                        }
                        formattedRules += `\t${rule}\n`;
                    });
                    edits.replace(document.uri, range, formattedRules);
                }
            }
            return vscode.workspace.applyEdit(edits);
        }
    });
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map