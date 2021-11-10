import type { TextDocument } from 'vscode-languageserver-textdocument';

import {
    CompletionList,
    Diagnostic,
    Position,
    Range,
} from 'vscode-html-languageservice';
import { getDocumentRegions, HTMLDocumentRegions } from './embeddedSupport';
import {
    getLanguageModelCache,
    LanguageModelCache,
} from './languageModelCache';
import { LangServerMap, StyleType } from './const';
import { getCSSMode } from './modes/cssMode';
import { getLESSMode } from './modes/lessMode';
import { getSCSSMode } from './modes/scssMode';

export * from 'vscode-html-languageservice';

export interface LanguageMode {
    getID(): string;
    doValidation?: (document: TextDocument) => Diagnostic[];
    doComplete?: (document: TextDocument, position: Position) => CompletionList;
    onDocumentRemoved(document: TextDocument): void;
    dispose(): void;
}

export interface LanguageModes {
    getModeAtPosition(
        document: TextDocument,
        position: Position
    ): LanguageMode | undefined;
    getModesInRange(document: TextDocument, range: Range): LanguageModeRange[];
    getAllModes(): LanguageMode[];
    getAllModesInDocument(document: TextDocument): LanguageMode[];
    getMode(languageID: StyleType): LanguageMode | undefined;
    onDocumentRemoved(document: TextDocument): void;
    dispose(): void;
}

export interface LanguageModeRange extends Range {
    mode: LanguageMode | undefined;
    attributeValue?: boolean;
}

export function getLanguageModes(): LanguageModes {
    const htmlLanguageService = LangServerMap.html;
    const cssLanguageService = LangServerMap[StyleType.css];
    const lessLanguageService = LangServerMap[StyleType.less];
    const scssLanguageService = LangServerMap[StyleType.scss];

    const documentRegions = getLanguageModelCache<HTMLDocumentRegions>(
        10,
        60,
        (document) => getDocumentRegions(htmlLanguageService, document)
    );

    let modelCaches: LanguageModelCache<any>[] = [];
    modelCaches.push(documentRegions);

    let modes: Partial<Record<StyleType, LanguageMode>> = {
        [StyleType.css]: getCSSMode(cssLanguageService, documentRegions),
        [StyleType.less]: getLESSMode(lessLanguageService, documentRegions),
        [StyleType.scss]: getSCSSMode(scssLanguageService, documentRegions),
    };

    return {
        getModeAtPosition(
            document: TextDocument,
            position: Position
        ): LanguageMode | undefined {
            const languageID = documentRegions
                .get(document)
                .getLanguageAtPosition(position) as StyleType | undefined;
            if (languageID) {
                return modes[languageID];
            }
            return undefined;
        },
        getModesInRange(
            document: TextDocument,
            range: Range
        ): LanguageModeRange[] {
            return documentRegions
                .get(document)
                .getLanguageRanges(range)
                .map(
                    r => ({
                        start: r.start,
                        end: r.end,
                        mode: r.languageID && modes[r.languageID],
                        attributeValue: r.attributeValue,
                    })
                );
        },
        getAllModesInDocument(document: TextDocument): LanguageMode[] {
            const result: LanguageMode[] = [];
            const ids = documentRegions.get(document).getLanguagesInDocument();

            for (const languageID of ids) {
                const mode = modes[languageID];
                if (mode) {
                    result.push(mode);
                }
            }
            return result;
        },
        getAllModes(): LanguageMode[] {
            const result = [];
            for (const languageID in modes) {
                const mode = modes[languageID as StyleType];
                if (mode) {
                    result.push(mode);
                }
            }
            return result;
        },
        getMode(languageID: StyleType) {
            return modes[languageID];
        },
        onDocumentRemoved(document: TextDocument) {
            modelCaches.forEach((mc) => mc.onDocumentRemoved(document));
            for (const mode in modes) {
                modes[mode as StyleType]?.onDocumentRemoved(document);
            }
        },
        dispose(): void {
            modelCaches.forEach((mc) => mc.dispose());
            modelCaches = [];
            for (const mode in modes) {
                modes[mode as StyleType]?.dispose();
            }
            modes = {};
        },
    };
}
