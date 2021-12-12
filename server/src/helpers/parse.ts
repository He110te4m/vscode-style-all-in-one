import type { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { StyleType } from '../const';
import { parseStyle, parseStyleByContent } from '../parser';
import { getNodeAtOffset, getNodeVarName } from './node';

export function findVarName(doc: TextDocument, pos: Position, type: StyleType) {
  const node = getNodeAtOffset(doc, doc.offsetAt(pos), type);
  if (!node) {
    return '';
  }

  return getNodeVarName(node);
}

export function getFileSymbols(content: string, file: string) {
  const styleSymbol = parseStyleByContent(content, file);
  const res = { [file]: styleSymbol };

  if (!styleSymbol.imports.length) {
    return res;
  }

  return {
    ...res,
    ...parseStyle(
      (styleSymbol.imports as { filepath: string }[]).map(
        (item) => item.filepath
      )
    ),
  };
}
