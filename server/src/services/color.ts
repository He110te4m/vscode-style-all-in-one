import { readFileSync } from 'fs';
import { extname } from 'path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { EXT_MAP, StyleType } from '../const';
import { getLanguageModes, LanguageModes } from '../languageModes';
import { getGlobalStylePath } from '../utils/config';
import { getFileStyleType } from '../utils/file';
import { parserStyle, parserStyleByContent, StyleSymbol } from './parser';

export async function parserColorMap(path: string) {
    const type = extname(path).slice(1);
    const id = getFileStyleType(path);
    const globalColorMap = parserGlobalColorMap();

    if (Object.keys(EXT_MAP).includes(type) || id !== StyleType.css || type === 'vue') {
        let businessColorMap: Record<string, string> = {};
        if (type === 'vue') {
            businessColorMap = parserColorMapByVue(path);
        } else {
            businessColorMap = parserColorMapByFile(path);
        }

        return {
            ...globalColorMap,
            ...businessColorMap
        };
    }
}

function parserColorMapBySymbols(symbols: Record<string, StyleSymbol>) {
    const colorMap: Record<string, string> = {};
    Object.values(symbols).forEach(symbol => {
        if (!symbol?.variables.length) {
            return;
        }
        symbol.variables.forEach(({ name, value }) => {
            colorMap[name] = value;
        });
    });

    return colorMap;
}

function parserGlobalColorMap() {
    const symbols = parserStyle(getGlobalStylePath());

    return parserColorMapBySymbols(symbols);
}

function parserColorMapByFile(path: string) {
    const symbols = parserStyle([path]);

    return parserColorMapBySymbols(symbols);
}

let languageModes: LanguageModes | null = null;

function parserColorMapByVue(path: string) {
    if (!languageModes) {
        languageModes = getLanguageModes();
    }

    const document = TextDocument.create(path, 'vue', 1, String(readFileSync(path)));
    const regions = languageModes.getLanguageRegion(document);

    const symbols: Record<string, StyleSymbol> = {};
    regions.getLanguagesInDocument().forEach(type => {
        if (type === StyleType.html) {
            return;
        }
        const doc = regions.getEmbeddedDocument(type);
        Object.assign(symbols, parserStyleByContent(doc.getText(), path, type));
    });

    return parserColorMapBySymbols(symbols);
}
