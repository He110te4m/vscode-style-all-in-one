import type { TextDocument } from 'vscode-languageserver-textdocument';
import { getCSSLanguageService, getLESSLanguageService, getSCSSLanguageService, LanguageService, Node } from 'vscode-css-languageservice';
import { StyleType } from '../const';

const lsMap: Record<StyleType, LanguageService> = {
  [StyleType.css]: getCSSLanguageService(),
  [StyleType.less]: getLESSLanguageService(),
  [StyleType.scss]: getSCSSLanguageService(),
};

/** Take out the corresponding ast node according to the offset. */
export function getNodeAtOffset(
  document: TextDocument,
  offset: number,
  type: StyleType
): Node | null {
  const stylesheet = lsMap[type].parseStylesheet(document);

  let currentNode: Node | null = null;
  stylesheet.accept((node: Node) => {
    if (node.offset === -1 && node.length === -1) {
      return true;
    }

    if (node.offset <= offset && node.end >= offset) {
      if (!currentNode || node.length <= currentNode.length) {
        currentNode = node;
      }

      return true;
    }

    return false;
  });

  return currentNode;
}

export function getNodeVarName(node: Node) {
  // get the node name as variable's name
  let varName = node?.getName?.() || node?.getText?.();
  if (!varName) {
    return '';
  }

  // Css variable name compatible processing
  if (varName.startsWith('--')) {
    varName = varName.slice(2);
  }

  return varName;
}
