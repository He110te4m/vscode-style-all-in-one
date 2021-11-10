import { getDocumentRegions, HTMLDocumentRegions } from '../embeddedSupport';
import type { LanguageModelCache } from '../languageModelCache';
import type { LanguageMode } from '../languageModes';

import { getLanguageService as getHTMLLanguageService } from 'vscode-html-languageservice';
import {
    LanguageService as SCSSLanguageService,
    Position,
    Range,
    TextDocument,
} from 'vscode-css-languageservice';
import { StyleType } from '../const';
import {
    getStyleMode,
    getVariableRegExp,
    getVarsCompletionList,
} from './common';
import { parserStyle } from '../services/parser';
import { URI } from 'vscode-uri';
import { parserScss, ScssSymbol } from '../services/parser/scss';
import { getRealPath } from '../utils/file';
import { getGlobalStyleByLang } from '../services/globalStyle';
import { getTextBeforeOffset } from '../utils/text';

/** scss 变量以 @ 开头，定义好前缀，做识别用 */
const variablePrefix = '$';

export function getSCSSMode(
    scssLanguageService: SCSSLanguageService,
    documentRegions: LanguageModelCache<HTMLDocumentRegions>
): LanguageMode {
    const mode = getStyleMode(
        StyleType.scss,
        scssLanguageService,
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

            const scssGlobalInfo = getGlobalStyleByLang(StyleType.scss);
            const symbolList = scssGlobalInfo
                ? Object.values(scssGlobalInfo)
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
                regions.getEmbeddedDocument(StyleType.scss).getText(),
                URI.parse(document.uri).fsPath,
                range
            );

            completionList.items.push(...vars, ...fileVars);

            return completionList;
        },
    };
}

function getVarsByFile(text: string, base: string, range: Range) {
    const curFileSymbol = parserScss(text, false);
    const list: ScssSymbol[] = [];

    const imports = curFileSymbol.imports;
    if (imports.length) {
        list.push(
            ...Object.values(
                parserStyle(
                    imports.map((item) => getRealPath(item.filepath, base)),
                    { limit: [StyleType.scss] }
                ) as Record<string, ScssSymbol>
            )
        );
    }

    return getVarsCompletionList(list, range);
}
