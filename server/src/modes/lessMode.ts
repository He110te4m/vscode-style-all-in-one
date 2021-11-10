import { getDocumentRegions, HTMLDocumentRegions } from '../embeddedSupport';
import type { LanguageModelCache } from '../languageModelCache';
import type { LanguageMode } from '../languageModes';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { getLanguageService as getHTMLLanguageService } from 'vscode-html-languageservice';
import { LessSymbol, parserLess } from '../services/parser/less';
import {
    LanguageService as LESSLanguageService,
    Position,
    Range,
} from 'vscode-css-languageservice';
import { StyleType } from '../const';
import {
    getStyleMode,
    getVariableRegExp,
    getVarsCompletionList,
} from './common';
import { URI } from 'vscode-uri';
import { getGlobalStyleByLang } from '../services/globalStyle';
import { parserStyle } from '../services/parser';
import { getRealPath } from '../utils/file';
import { getTextBeforeOffset } from '../utils/text';

/** less 变量以 @ 开头，定义好前缀，做识别用 */
const variablePrefix = '@';

export function getLESSMode(
    lessLanguageService: LESSLanguageService,
    documentRegions: LanguageModelCache<HTMLDocumentRegions>
): LanguageMode {
    const mode = getStyleMode(
        StyleType.less,
        lessLanguageService,
        documentRegions
    );

    return {
        ...mode,
        doComplete(document: TextDocument, position: Position) {
            const completionList = mode.doComplete!(document, position);

            const prefix = getTextBeforeOffset(
                document.getText(),
                document.offsetAt(position)
            );

            if (!getVariableRegExp(variablePrefix).test(prefix)) {
                return completionList;
            }

            const lessGlobalInfo = getGlobalStyleByLang(StyleType.less);
            const symbolList = lessGlobalInfo
                ? Object.values(lessGlobalInfo)
                : [];

            const varPrefixIdx = prefix.lastIndexOf(variablePrefix);
            const colorPrefixIdx = prefix.lastIndexOf('#');
            const idx = Math.max(varPrefixIdx, colorPrefixIdx);

            if (idx < 0) {
                return completionList;
            }

            const range = Range.create(
                Position.create(position.line, idx),
                position
            );

            const regions = getDocumentRegions(
                getHTMLLanguageService(),
                document
            );

            // 解析变量进行提示
            const vars = getVarsCompletionList(symbolList, range);
            const fileVars = getVarsByFile(
                regions.getEmbeddedDocument(StyleType.less).getText(),
                URI.parse(document.uri).fsPath,
                range
            );

            completionList.items.push(...vars, ...fileVars);

            return completionList;
        },
    };
}

function getVarsByFile(text: string, base: string, range: Range) {
    const curFileSymbol = parserLess(text, false);
    const list: LessSymbol[] = [];

    const imports = curFileSymbol.imports;
    if (imports.length) {
        list.push(
            ...Object.values(
                parserStyle(
                    imports.map((item) => getRealPath(item.filepath, base)),
                    { limit: [StyleType.less] }
                ) as Record<string, LessSymbol>
            )
        );
    }

    return getVarsCompletionList(list, range);
}
