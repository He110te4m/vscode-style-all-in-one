import {
    CompletionList,
    createConnection,
    Diagnostic,
    IPCMessageReader,
    IPCMessageWriter,
    TextDocuments,
    TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { getLanguageModes, LanguageMode, LanguageModes } from './languageModes';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { clearCache, parserStyle } from './services/parser';
import {
    getGlobalStylePath,
    getRootDir,
    setAliases,
    setGlobalStylePath,
    setRootDir,
} from './utils/config';
import { URI } from 'vscode-uri';
import { EXT_MAP, LangServerMap } from './const';
import { getDefinition } from './services/definition';
import { getHover } from './services/hover';

// 创建 IPC 连接池
const connection = createConnection(
    new IPCMessageReader(process),
    new IPCMessageWriter(process)
);

// 创建简易 document manager，仅支持响应变化
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let languageModes: LanguageModes;

const { error } = connection.console;

/** 连接准备中 */
connection.onInitialize((params) => {
    languageModes = getLanguageModes();

    const { initializationOptions: opts } = params;
    setRootDir(opts?.rootDir ?? getRootDir());

    documents.onDidClose((e) => {
        languageModes.onDocumentRemoved(e.document);
    });
    connection.onShutdown(() => {
        languageModes.dispose();
    });

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Full,
            // 通知 client server 是支持代码补全的
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: ['@', '-', '#', '('],
            },
            // server 提供 hover provider
            hoverProvider: true,
            // server 提供 definition provider
            definitionProvider: true,
        },
    };
});

/** 连接建立完成回调 */
connection.onInitialized(() => {
    // 初始化连接后，再获取配置信息，否则连接未建立，获取必定失败
    updateGlobalInfo();
});

/** 用户修改配置回调 */
connection.onDidChangeConfiguration(() => {
    // 配置更新后重新初始化全局配置
    updateGlobalInfo();
});

/** 文件修改回调 */
connection.onDidChangeWatchedFiles(({ changes }) => {
    if (!changes.length) {
        return;
    }

    parserStyle(
        changes
            .filter(({ uri }) => !!uri)
            .map(({ uri }) => URI.parse(uri).fsPath),
        { ignoreCache: true }
    );
});

/** 打开了新的文件，或者切换文件 */
documents.onDidChangeContent((change) => {
    validateTextDocument(change.document);
});

/** 更新全局信息 */
async function updateGlobalInfo() {
    const config = await connection.workspace.getConfiguration(
        'style-all-in-one'
    );
    setAliases(config?.['path-aliases'] ?? {});

    const globalStyle = config?.['global-style'] ?? [];
    setGlobalStylePath(globalStyle);
    clearCache();
    parserStyle(getGlobalStylePath());
}

/** 校验文档内容 */
async function validateTextDocument(textDocument: TextDocument) {
    try {
        const version = textDocument.version;
        const diagnostics: Diagnostic[] = [];
        const id = textDocument.languageId?.toLowerCase();
        if (['vue'].includes(id)) {
            const modes = languageModes.getAllModesInDocument(textDocument);
            const latestTextDocument = documents.get(textDocument.uri);
            if (latestTextDocument && latestTextDocument.version === version) {
                modes.forEach((mode) => {
                    if (mode.doValidation) {
                        mode.doValidation(latestTextDocument).forEach((d) => {
                            diagnostics.push(d);
                        });
                    }
                });
                connection.sendDiagnostics({
                    uri: latestTextDocument.uri,
                    diagnostics,
                });
            }
        } else if (Object.keys(EXT_MAP).includes(id)) {
            const type = EXT_MAP[id];
            const languageService = LangServerMap[type];
            const stylesheet = languageService.parseStylesheet(textDocument);
            const diagnostic = languageService.doValidation(
                textDocument,
                stylesheet
            );
            connection.sendDiagnostics({
                uri: textDocument.uri,
                diagnostics: diagnostic,
            });
        }
    } catch (e) {
        error(`Error while validating ${textDocument.uri}`);
        error(String(e));
    }
}

/** 自动补全提示内容 */
connection.onCompletion(async (textDocumentPosition) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return null;
    }

    let mode: LanguageMode | undefined;

    const id = document.languageId.toLowerCase();
    if (document.languageId === 'vue') {
        const { position } = textDocumentPosition;
        mode = languageModes.getModeAtPosition(document, position);
    } else if (Object.keys(EXT_MAP).includes(id)) {
        const cache = getLanguageModes();
        mode = cache.getMode(EXT_MAP[id]);
    }

    if (!mode?.doComplete) {
        return CompletionList.create();
    }
    const doComplete = mode.doComplete!;

    const completionList = doComplete(document, textDocumentPosition.position);

    return completionList;
});

/** 转到当前词定义处 */
connection.onDefinition((textDocumentPosition) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return null;
    }

    return getDefinition(document, textDocumentPosition.position);
});

/** 悬浮词显示详细信息 */
connection.onHover((textDocumentPosition) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return null;
    }

    return getHover(document, textDocumentPosition.position);
});

// document manager 监听连接池中 client 的 document 变化
documents.listen(connection);

// 开启连接池监听
connection.listen();
