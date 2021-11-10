import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { LanguageService, Node } from 'vscode-css-languageservice';

/** 根据 offset 取出对应的 ast 节点 */
export function getNodeAtOffset(
    document: TextDocument,
    ls: LanguageService,
    offset: number
): Node | null {
    const stylesheet = ls.parseStylesheet(document);

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
    // 取出节点名，目前暂只适配变量名
    let varName = node?.getName?.() || node?.getText?.();
    if (!varName) {
        return '';
    }

    // 兼容处理下 css 的变量名
    if (varName.startsWith('--')) {
        varName = varName.slice(2);
    }

    return varName;
}
