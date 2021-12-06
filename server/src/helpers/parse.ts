import type { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { EXT_MAP, StyleType } from '../const';
import { languageModel } from '../language/cache';
import { parseStyle, parseStyleByContent } from '../parser';
import { getNodeAtOffset, getNodeVarName } from './node';

export function findVarName(doc: TextDocument, pos: Position, type: StyleType) {
  const node = getNodeAtOffset(doc, doc.offsetAt(pos), type);
  if (!node) {
    return '';
  }

  return getNodeVarName(node);
}

export function getFileSymbols(doc: TextDocument, pos: Position) {
  const file = URI.parse(doc.uri).fsPath ?? doc.uri;
  if (!file) {
    return null;
  }

  const langID = doc.languageId.toLowerCase();

  if (langID === 'vue') {
    return getFileSymbolsInVue(doc, pos, file);
  } else if (Object.keys(EXT_MAP).includes(langID)) {
    return parseStyle(file);
  }

  return null;
}

function getFileSymbolsInVue(
  doc: TextDocument,
  pos: Position,
  file: string
) {
  const regions = languageModel.get(doc);

  const type = regions.getLanguageAtPosition(pos);
  if (!type) {
    return null;
  }

  const styleDoc = regions.getEmbeddedDocument(type);
  const styleSymbol = parseStyleByContent(styleDoc.getText(), file, type);
  const res = { file: styleSymbol };

  if (!styleSymbol.imports.length) {
    return res;
  }

  return {
    ...res,
    ...parseStyle(
      (styleSymbol.imports as { filepath: string; }[]).map(
        (item) => item.filepath
      )
    ),
  };
}
