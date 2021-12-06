import { readFileSync } from 'fs';
import { Location, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { getGlobalSymbols } from '../config';
import { EXT_MAP, StyleType } from '../const';
import { findVarName, getFileSymbols } from '../helpers/parse';
import { languageModel } from '../language/cache';
import { StyleSymbol } from '../parser';

export function getDefinition(doc: TextDocument, pos: Position) {
  const docPath = URI.parse(doc.uri).fsPath ?? doc.uri;
  if (!docPath) {
    return null;
  }

  const id = doc.languageId.toLowerCase();
  if (id === 'vue') {
    const regions = languageModel.get(doc);
    const type = regions.getLanguageAtPosition(pos);
    if (!type) {
      return null;
    }
    const styleDoc = regions.getEmbeddedDocument(type);

    return findDefinition(styleDoc, pos, type);
  } else if (Object.keys(EXT_MAP).includes(id)) {
    const type = EXT_MAP[id];

    return findDefinition(doc, pos, type);
  }

  return null;
}

function findDefinition(doc: TextDocument, pos: Position, type: StyleType) {
  const varName = findVarName(doc, pos, type);

  if (!varName) {
    return null;
  }

  const fileSymbolsMap = getFileSymbols(doc, pos) || {};
  const globalSymbolMap = getGlobalSymbols();
  return (
    getDefinitionLocation(fileSymbolsMap, type, varName) ||
    getDefinitionLocation(globalSymbolMap, type, varName)
  );
}

function getDefinitionLocation(
  symbolMap: Record<string, StyleSymbol>,
  type: StyleType,
  varName: string
) {
  let loc: Location | null = null;
  Object.keys(symbolMap).forEach((uri) => {
    const symbol = symbolMap[uri];
    if (!symbol) {
      return;
    }

    const v = symbol.variables.find((v) => v.name === varName);
    if (!v?.offset && v?.offset !== 0) {
      return;
    }

    const filePath = URI.file(uri).toString();
    const doc = TextDocument.create(uri, type, 1, readFileSync(uri).toString());

    const pos = doc.positionAt(v.offset);
    loc = Location.create(filePath, Range.create(pos, pos));
  });

  return loc;
}
