import { readFileSync } from 'fs';
import { Location, Range } from 'vscode-languageserver';
import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { EXT_MAP, LangServerMap, StyleType } from '../const';
import { getDocumentRegions } from '../embeddedSupport';
import { getLanguageModes, LanguageModes } from '../languageModes';
import { getGlobalStyleByLang } from './globalStyle';
import { getNodeAtOffset, getNodeVarName } from '../utils/node';
import { parserStyle, parserStyleByContent } from './parser';

let languageModes: LanguageModes | null = null;

export function getDefinition(document: TextDocument, position: Position) {
    const documentPath = URI.parse(document.uri).fsPath ?? document.uri;
    if (!documentPath) {
        return null;
    }

    const id = document.languageId.toLowerCase();

    if (id === 'vue') {
        return getDefinitionInVue(document, position, documentPath);
    } else if (Object.keys(EXT_MAP).includes(id)) {
        return getDefinitionInStyleFile(document, position, documentPath, id);
    }

    return null;
}

function getDefinitionInVue(
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
    if (!node) {
        return null;
    }

    // 取出节点名，目前暂只适配变量名
    const varName = getNodeVarName(node);
    if (!varName) {
        return null;
    }

    return (
        getLocationByDocument(id, varName, documentPath, document) ||
        getLocationByGlobal(id, varName)
    );
}

function getDefinitionInStyleFile(
    document: TextDocument,
    position: Position,
    documentPath: string,
    id: string
) {
    // 解析需要 goDefinition 的节点
    const node = getNodeAtOffset(
        document,
        LangServerMap[EXT_MAP[id]],
        document.offsetAt(position)
    );
    if (!node) {
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
        getLocationByFile(id, varName, documentPath) ||
        getLocationByGlobal(id, varName)
    );
}

function getLocationByDocument(
    id: string,
    varName: string,
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
    const locationMap = getDefinitionMapBySymbol(symbolMap, EXT_MAP[id]);

    return locationMap[varName];
}

/** 解析文件自身的变量，查找对应的定义 */
function getLocationByFile(id: string, varName: string, filename: string) {
    const symbolMap = parserStyle([filename]);
    const locationMap = getDefinitionMapBySymbol(symbolMap, EXT_MAP[id]);

    return locationMap[varName];
}

/** 解析全局变量，查找对应的定义 */
function getLocationByGlobal(id: string, varName: string) {
    const symbolMap = getGlobalStyleByLang(EXT_MAP[id]);
    const locationMap = getDefinitionMapBySymbol(symbolMap, EXT_MAP[id]);

    return locationMap[varName];
}

/** 获取文件对应的 { 变量名: Location } 映射表 */
function getDefinitionMapBySymbol(
    symbolMap: ReturnType<typeof parserStyle>,
    id: StyleType
) {
    const definitionMap: Record<string, Location> = {};

    Object.entries(symbolMap).forEach(([uri, symbol]) => {
        if (!symbol) {
            return;
        }

        const filePath = URI.file(uri).toString();
        const document = TextDocument.create(
            uri,
            id,
            1,
            String(readFileSync(uri))
        );

        symbol.variables.forEach((variable) => {
            if (!variable.offset && variable.offset !== 0) {
                return;
            }

            const position = document.positionAt(variable.offset);

            definitionMap[variable.name] = Location.create(
                filePath,
                Range.create(position, position)
            );
        });
    });

    return definitionMap;
}
