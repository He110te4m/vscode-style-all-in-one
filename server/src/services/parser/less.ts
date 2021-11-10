import { readFileSync } from 'fs';
import { parseSymbols } from 'less-symbols-parser';

export type LessSymbol = ReturnType<typeof parseSymbols>;
export type LessStore = Record<string, LessSymbol>;

export function parserLess(path: string, isFile = true) {
    const content = isFile ? String(readFileSync(path)) : path;

    return parseSymbols(content);
}
