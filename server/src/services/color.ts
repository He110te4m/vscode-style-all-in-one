import { readFileSync } from 'fs';
import { getGlobalSymbols } from '../config';
import { getFileSymbols } from '../helpers/parse';
import { StyleSymbol } from '../parser';

export function getColorMap(path: string) {
  const globalSymbolMap = getGlobalSymbols();

  const content = String(readFileSync(path));
  const fileSymbolsMap: Record<string, StyleSymbol> = getFileSymbols(content, path);

  return parseColorMapBySymbols({ ...fileSymbolsMap, ...globalSymbolMap });
}

function parseColorMapBySymbols(symbols: Record<string, StyleSymbol>) {
  const colorMap: Record<string, string> = {};
  Object.values(symbols).forEach((symbol) => {
    if (!symbol?.variables.length) {
      return;
    }
    symbol.variables.forEach(({ name, value }) => {
      colorMap[name] = value;
    });
  });

  return colorMap;
}
