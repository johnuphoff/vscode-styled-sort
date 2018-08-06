'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
String.prototype.insert = function (index, string) {
    if (index > 0) {
        return this.substring(0, index) + string + this.substring(index, this.length);
    }
    return string + this;
};
function insertLineBreaks(string) {
    let result = '';
    for (let index = 0; index < string.length; index++) {
        const lastChar = index > 0 ? string[index - 1] : string[0];
        const char = string[index];
        const nextChar = index > string.length ? string[string.length] : string[index + 1];
        result += char;
        if ((char === '{' && lastChar !== '$')
            || char === ';'
            || (char === '}' && nextChar !== ';')) {
            result += '\n';
        }
    }
    return result;
}
function arrayFromString(string) {
    return string
        .split('\n')
        .map((entry) => entry.trim())
        .filter(function (element) { return element !== ''; });
}
function sortRules(array) {
    let sortedArray = array.filter((element) => {
        return element !== '';
    })
        .sort((a, b) => {
        return a.replace(/^\W+/, 'z').localeCompare(b.replace(/^\W+/, 'z'));
    });
    return sortedArray;
}
function sortTemplateLiterals(array) {
    let sortedArray = array;
    array.map((rule, index) => {
        if (rule.match(/^[$]{.*}/g)) {
            sortedArray.splice(index, 1);
            sortedArray.unshift(rule);
        }
    });
    return sortedArray;
}
function addNewLineBetweenGroups(array, numberOfTabs = 1) {
    let result = '';
    array.map((rule, index) => {
        // 👍 We want line breaks between template literals and other groups
        if (!rule.match(/^[$]{.*}/g) && index > 1 && array[index - 1].match(/^[$]{.*}/g)) {
            result += '\n';
        }
        // 👍 We want line breaks between a vendor prefix and any previous rules or selectors
        if (array.length > 0 && rule.match(/-webkit-|-moz-|-ms-|-o-/g) && !array[index - 1].match(/-webkit-|-moz-|-ms-|-o-/g)) {
            result += '\n';
        }
        result += `${('\t').repeat(numberOfTabs)}${rule}\n`;
    });
    return result;
}
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
                    let rulesString = match[2];
                    // now insert line breaks so that we can safely split on \n
                    const resultString = insertLineBreaks(rulesString);
                    const rulesArray = arrayFromString(resultString);
                    let pseudoSelector = '';
                    let pseudoSelectorString = '';
                    let pseudoSelectorExists = false;
                    let mutableRules = rulesArray.slice(0);
                    // Let's hunt for pseudo selectors
                    for (let i = 0; i < rulesArray.length; i++) {
                        const line = rulesArray[i];
                        // Pseudo selector exists when line matches regex
                        if (line.match(/^&:/g)) {
                            pseudoSelectorExists = true;
                            // Save the selector
                            pseudoSelector = line;
                            // Remove the line from mutableRules
                            mutableRules[i] = '';
                            // Continue to next iteration
                            continue;
                        }
                        // all subsequent lines are appended to subquery string
                        if (pseudoSelectorExists) {
                            // Remove the line from mutableRules
                            mutableRules[i] = '';
                            if (line !== '}') {
                                pseudoSelectorString += line;
                            }
                            else {
                                // We have reached the end of the pseudo selector
                                pseudoSelectorExists = false;
                                // now insert line breaks so that we can safely split on \n like we did previously
                                const pseudoSelectorResultString = insertLineBreaks(pseudoSelectorString);
                                const pseudoSelectorRulesArray = arrayFromString(pseudoSelectorResultString);
                                // sort inner rules alphabetically
                                const sortedPseudoSelectorRules = sortTemplateLiterals(sortRules(pseudoSelectorRulesArray));
                                // Add line break between groups
                                let result = addNewLineBetweenGroups(sortedPseudoSelectorRules, 2);
                                mutableRules.push(`${pseudoSelector}\n${result}\t}`);
                                // Reset the string for the next cycle
                                pseudoSelectorString = '';
                            }
                        }
                    }
                    // TODO Combine these two sorts
                    // sort outer rules alphabetically
                    const sortedRules = sortTemplateLiterals(sortRules(mutableRules));
                    // Add line break between groups
                    let result = addNewLineBetweenGroups(sortedRules);
                    // clean up spaces and tabs between pseudo selectors
                    const regEx2 = /&:.*/g;
                    let match2 = [];
                    while (match2 = regEx2.exec(result)) {
                        result = result.insert(match2.index, '\n\t');
                    }
                    edits.replace(document.uri, range, result);
                }
            }
            return vscode.workspace.applyEdit(edits);
        }
    });
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map