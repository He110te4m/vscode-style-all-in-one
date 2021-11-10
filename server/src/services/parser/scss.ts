import { readFileSync } from 'fs';
import { parseSymbols } from 'scss-symbols-parser';

export type ScssSymbol = ReturnType<typeof parseSymbols>;
export type ScssStore = Record<string, ScssSymbol>;

export function parserScss(path: string, isFile = true) {
    const content = isFile ? String(readFileSync(path)) : path;

    return parseSymbols(content);
}
