import { Hover, MarkupKind } from 'vscode-languageserver';
import { TextDocument, Position } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { EXT_MAP, LangServerMap, NodeType, StyleType } from '../const';
import { getDocumentRegions } from '../embeddedSupport';
import { getLanguageModes, LanguageModes } from '../languageModes';
import { getNodeAtOffset, getNodeVarName } from '../utils/node';
import { getGlobalStyleByLang } from './globalStyle';
import { parserStyle, parserStyleByContent } from './parser';

let languageModes: LanguageModes | null = null;

export function getHover(
    document: TextDocument,
    position: Position
): Hover | null {
    const documentPath = URI.parse(document.uri).fsPath ?? document.uri;
    if (!documentPath) {
        return null;
    }

    const id = document.languageId.toLowerCase();
    if (id === 'vue') {
        return getHoverInVue(document, position, documentPath);
    } else if (Object.keys(EXT_MAP).includes(id)) {
        return getHoverInStyleFile(document, position, documentPath, id);
    }

    return null;
}

function getHoverInVue(
    document: TextDocument,
    position: Position,
    documentPath: string
) {
    if (!languageModes) {
        languageModes = getLanguageModes();
    }

    const mode = languageModes.getModeAtPosition(document, position);
    if (!mode) {
        return null;
    }

    const id = mode.getID();

    // 解析需要 goDefinition 的节点
    const node = getNodeAtOffset(
        document,
        LangServerMap[EXT_MAP[id]],
        document.offsetAt(position)
    );
    if (!node || node.type !== NodeType.VariableName) {
        return null;
    }

    // 取出节点名，目前暂只适配变量名
    const varName = getNodeVarName(node);
    if (!varName) {
        return null;
    }

    return (
        getHoverByDocument(varName, id, documentPath, document) ||
        getHoverByGlobal(varName, id)
    );
}

function getHoverInStyleFile(
    document: TextDocument,
    position: Position,
    documentPath: string,
    id: string
) {
    // 解析需要 hover 的节点
    const node = getNodeAtOffset(
        document,
        LangServerMap[EXT_MAP[id]],
        document.offsetAt(position)
    );
    if (
        !node ||
        ![NodeType.VariableName, NodeType.Identifier].includes(node.type)
    ) {
        return null;
    }

    // 取出节点名，目前暂只适配变量名
    const varName = getNodeVarName(node);
    if (!varName) {
        return null;
    }

    // 解析文件自身的变量，查找对应的定义
    // 若查询失败，查找全局变量
    return (
        getHoverByFile(varName, documentPath) || getHoverByGlobal(varName, id)
    );
}

function getHoverByDocument(
    varName: string,
    id: string,
    path: string,
    fileDocument: TextDocument
) {
    const document = getDocumentRegions(
        LangServerMap[StyleType.html],
        fileDocument
    ).getEmbeddedDocument(EXT_MAP[id]);

    const symbolMap = parserStyleByContent(
        document.getText(),
        path,
        EXT_MAP[id]
    );
    const hoverMap = getHoverMapBySymbol(symbolMap);

    return hoverMap[varName];
}

function getHoverByFile(varName: string, filename: string) {
    const symbolMap = parserStyle([filename]);
    const hoverMap = getHoverMapBySymbol(symbolMap);

    return hoverMap[varName];
}

function getHoverByGlobal(varName: string, id: string) {
    const symbolMap = getGlobalStyleByLang(EXT_MAP[id]);
    const hoverMap = getHoverMapBySymbol(symbolMap);

    return hoverMap[varName];
}

/** 获取文件对应的 { 变量名: Hover } 映射表 */
function getHoverMapBySymbol(symbolMap: ReturnType<typeof parserStyle>) {
    const definitionMap: Record<string, Hover> = {};

    Object.entries(symbolMap).forEach(([uri, symbol]) => {
        if (!symbol) {
            return;
        }

        symbol.variables.forEach((variable) => {
            if (!variable.offset && variable.offset !== 0) {
                return;
            }

            definitionMap[variable.name] = {
                contents: {
                    kind: MarkupKind.Markdown,
                    value: `
变量 \`${variable.name}\` 的值为 \`${variable.value}\`

所在文件：\`${uri}\`

\`ctrl + 左键\` 单击变量，可快速跳转至变量定义处
`
                },
            };
        });
    });

    return definitionMap;
}
