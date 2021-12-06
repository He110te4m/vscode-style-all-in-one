import { readFileSync } from 'fs';
import { extname } from 'path';
import { Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getGlobalSymbols } from '../config';
import { EXT_MAP } from '../const';
import { getFileSymbols } from '../helpers/parse';
import { languageModel } from '../language/cache';
import { StyleSymbol } from '../parser';

export function getColorMap(path: string) {
  const globalSymbolMap = getGlobalSymbols();
  const fileSymbolsMap: Record<string, StyleSymbol> = {};

  const ext = extname(path).slice(1);
  const pos = Position.create(0, 0);

  if (ext === 'vue') {
    const regions = languageModel.get(
      TextDocument.create(path, 'vue', 1, String(readFileSync(path)))
    );
    const types = regions.getLanguagesInDocument();
    types.forEach((type) => {
      const doc = regions.getEmbeddedDocument(type);
      Object.assign(fileSymbolsMap, getFileSymbols(doc, pos));
    });
  } else if (Object.keys(EXT_MAP).includes(ext)) {
    Object.assign(
      fileSymbolsMap,
      getFileSymbols(
        TextDocument.create(path, EXT_MAP[ext], 1, String(readFileSync(path))),
        pos
      )
    );
  }

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
