import {
  CodeLensParams,
  CompletionParams,
  Connection,
  DefinitionParams,
  HoverParams,
  InitializeParams,
  InitializeResult,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  getGlobalStyle,
  getRootDir,
  setAliases,
  setGlobalStyle,
  setRootDir,
} from '../config';
import { languageModel } from '../language/cache';
import { clearCache, parseStyle } from '../parser';
import { getCodeLens } from '../services/codeLens';
import { getColorMap } from '../services/color';
import { getCompleteList } from '../services/completion';
import { getDefinition } from '../services/definition';

let isHideCodeLens = false;
let isEnableVarToValue = false;

export function initListener(
  conn: Connection,
  docs: TextDocuments<TextDocument>
) {
  regInitEvent(conn, docs);
  regHelperEvent(conn, docs);
  regColorParserService(conn);
}

function regInitEvent(conn: Connection, docs: TextDocuments<TextDocument>) {
  conn.onInitialize((params: InitializeParams) => {
    docs.onDidClose((e) => {
      languageModel.onDocumentRemoved(e.document);
    });
    conn.onShutdown(() => {
      languageModel.dispose();
    });

    return onInitialize(params);
  });

  conn.onInitialized(() => {
    // After initializing the connection, obtain the configuration information,
    // otherwise the connection is not established and the acquisition must fail.
    updateGlobalInfo(conn);
  });

  conn.onDidChangeConfiguration(() => {
    // Reinitialize the global configuration after configuration update.
    updateGlobalInfo(conn);
  });
}

function regHelperEvent(conn: Connection, docs: TextDocuments<TextDocument>) {
  conn.onCompletion(onCompletion(docs));
  conn.onDefinition(onDefinition(docs));
  conn.onHover(onHover(docs));
  conn.onCodeLens(onCodeLens(docs));
}

function regColorParserService(conn: Connection) {
  conn.onRequest('parse-color-map', ({ path }: { path: string }) => {
    const colorMap = getColorMap(path);
    conn.sendRequest('show-color-blocks', {
      uri: path,
      colorMap,
    });
  });
}

function onInitialize(params: InitializeParams): InitializeResult {
  const { initializationOptions: opts } = params;
  setRootDir(opts?.rootDir ?? getRootDir());

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['@', '-', '#', '('],
      },
      hoverProvider: true,
      definitionProvider: true,
      codeLensProvider: {
        resolveProvider: true,
      },
    },
  };
}

/** Reinitialize the global configuration */
async function updateGlobalInfo(conn: Connection) {
  const config = await conn.workspace.getConfiguration('style-all-in-one');
  setAliases(config?.['path-aliases'] ?? {});
  isHideCodeLens = config?.['hide-variable-toggle-switch'] ?? false;
  isEnableVarToValue = config?.['enable-variable-convert-to-value'] ?? false;

  const globalStyle = config?.['global-style'] ?? [];
  setGlobalStyle(globalStyle);
  clearCache();
  parseStyle(getGlobalStyle());
}

function onCompletion(docs: TextDocuments<TextDocument>) {
  return ({ textDocument, position }: CompletionParams) => {
    const doc = docs.get(textDocument.uri);
    if (!doc) {
      return null;
    }

    return getCompleteList(doc, position);
  };
}

function onDefinition(docs: TextDocuments<TextDocument>) {
  return ({ textDocument, position }: DefinitionParams) => {
    const doc = docs.get(textDocument.uri);
    if (!doc) {
      return null;
    }

    return getDefinition(doc, position);
  };
}

function onHover(docs: TextDocuments<TextDocument>) {
  return ({ textDocument }: HoverParams) => {
    const doc = docs.get(textDocument.uri);
    if (!doc) {
      return null;
    }

    return null;
  };
}

function onCodeLens(docs: TextDocuments<TextDocument>) {
  return ({ textDocument }: CodeLensParams) => {
    if (isHideCodeLens) {
      return null;
    }

    const doc = docs.get(textDocument.uri);
    if (!doc) {
      return null;
    }

    return getCodeLens(doc, {
      isEnableVarToValue
    });
  };
}
