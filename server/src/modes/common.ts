import { CompletionItem, CompletionItemKind, LanguageService } from 'vscode-css-languageservice';
import { HTMLDocumentRegions } from '../embeddedSupport';
import { LanguageModelCache } from '../languageModelCache';
import { LanguageMode, Position } from '../languageModes';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { StyleType } from '../const';
import { StyleSymbol } from '../services/parser';
import { CssSymbol } from '../services/parser/css';

export function getStyleMode(
    lang: StyleType,
    languageService: LanguageService,
    documentRegions: LanguageModelCache<HTMLDocumentRegions>
): LanguageMode {
    return {
        getID() {
            return lang;
        },
        doValidation(document: TextDocument) {
            // Get virtual CSS document, with all non-CSS code replaced with whitespace
            const embedded = documentRegions
                .get(document)
                .getEmbeddedDocument(lang);
            const stylesheet = languageService.parseStylesheet(embedded);
            return languageService.doValidation(embedded, stylesheet);
        },
        doComplete(document: TextDocument, position: Position) {
            // Get virtual CSS document, with all non-CSS code replaced with whitespace
            const embedded = documentRegions
                .get(document)
                .getEmbeddedDocument(lang);
            const stylesheet = languageService.parseStylesheet(embedded);
            return languageService.doComplete(
                embedded,
                position,
                stylesheet
            );
        },
        onDocumentRemoved(_document: TextDocument) {
            /* nothing to do */
        },
        dispose() {
            /* nothing to do */
        },
    };
}

export function getVarsCompletionList(
    symbolList: StyleSymbol[],
    range: Range,
    formatName: (name: string) => string = name => name
) {
    return symbolList.reduce((list, item) => {
        return list.concat(
            ...(item!.variables as CssSymbol['variables']).map(
                ({ name, value }): CompletionItem[] => {
                    const label = formatName(name);

                    return [
                        {
                            label,
                            detail: `${label} value is ${value}`,
                            textEdit: {
                                newText: label,
                                range,
                            },
                            kind: CompletionItemKind.Variable,
                        },
                        {
                            label: value,
                            detail: `${label} value is ${value}`,
                            textEdit: {
                                newText: label,
                                range,
                            },
                            kind: CompletionItemKind.Variable,
                        },
                    ];
                }
            )
        );
    }, [] as CompletionItem[]);
}

/** 生成变量前缀的校验正则 */
export function getVariableRegExp(prefix: string, suffix = '') {
    return new RegExp(`${prefix}[a-z-_]*${suffix + '?'}$`, 'i');
}
