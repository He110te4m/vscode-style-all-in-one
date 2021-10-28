import { getDocumentRegions, HTMLDocumentRegions } from '../embeddedSupport';
import type { LanguageModelCache } from '../languageModelCache';
import type { LanguageMode } from '../languageModes';

import { getLanguageService as getHTMLLanguageService } from 'vscode-html-languageservice';
import {
    LanguageService as CSSLanguageService,
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
import { getTextAfterOffset, getTextBeforeOffset } from '../utils/text';
import { CssSymbol, parserCss } from '../services/parser/css';
import { URI } from 'vscode-uri';
import { getGlobalStyleByLang } from '../services/globalStyle';
import { parserStyle } from '../services/parser';
import { getRealPath } from '../utils/file';

export function getCSSMode(
    cssLanguageService: CSSLanguageService,
    documentRegions: LanguageModelCache<HTMLDocumentRegions>
): LanguageMode {
    const mode = getStyleMode(
        StyleType.css,
        cssLanguageService,
        documentRegions
    );
    return {
        ...mode,
        doComplete(document: TextDocument, position: Position) {
            const completionList = mode.doComplete!(document, position);
            const text = document.getText();
            const offset = document.offsetAt(position);
            const prefix = getTextBeforeOffset(text, offset);
            const suffix = getTextAfterOffset(text, offset);
            if (!getVariableRegExp('(var\\()?--?', '\\)').test(prefix)) {
                return completionList;
            }

            const cssGlobalInfo = getGlobalStyleByLang(StyleType.css);
            const symbolList = cssGlobalInfo
                ? Object.values(cssGlobalInfo)
                : [];
            const replaceFlags = ['var(', ' -', ':-', '--', '#'];
            const range = getRange(prefix, replaceFlags, position);
            if (!range) {
                return completionList;
            }

            // 含有 )，需要把 ) 一起替换了
            if (suffix.startsWith(')')) {
                range.end.character = range.end.character + 1;
            }

            const vars = getVarsCompletionList(
                symbolList,
                range,
                (name) => `var(--${name})`
            );

            const regions = getDocumentRegions(
                getHTMLLanguageService(),
                document
            );

            const fileVars = getVarsByFile(
                regions.getEmbeddedDocument(StyleType.css).getText(),
                URI.parse(document.uri).fsPath,
                range
            );

            completionList.items.push(...vars, ...fileVars);

            return completionList;
        },
    };
}

function getRange(prefix: string, replaceFlags: string[], position: Position) {
    let range: Range | null = null;
    for (const text of replaceFlags) {
        const idx = prefix.lastIndexOf(text);

        if (idx > -1) {
            range = Range.create(
                Position.create(
                    position.line,
                    text.startsWith(' ') ? idx + 1 : idx
                ),
                position
            );
            break;
        }
    }

    return range;
}

function getVarsByFile(text: string, base: string, range: Range) {
    // TODO: 这里会触发 postcss 语法解析失败，导致无法读取 @import 导入的变量
    const curFileSymbol = parserCss(text, false);
    const list: CssSymbol[] = [];

    const imports = curFileSymbol.imports;
    if (imports.length) {
        list.push(
            ...Object.values(
                parserStyle(
                    imports.map((item) => getRealPath(item.filepath, base)),
                    { limit: [StyleType.css] }
                ) as Record<string, CssSymbol>
            )
        );
    }

    return getVarsCompletionList(list, range, (name) => `var(--${name})`);
}
