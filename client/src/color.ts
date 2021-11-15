import { throttle } from 'lodash';
import { extname } from 'path';
import { DecorationOptions, Range, window, workspace } from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { SUPPORT_FILES } from './const';
import colorChecker from 'css-color-checker';

interface ShowColorBlockParams {
    uri: string;
    colorMap: Record<string, string>;
}

export function registerColorProvider(client: LanguageClient) {
    client.onRequest('show-color-blocks', (params: ShowColorBlockParams) => {
        updateColor(params);
    });

    const checkFn = throttle(() => {
        const res = checkIsNeedUpdateColor();
        if (res !== false) {
            client.sendRequest('parser-color-map', {
                path: res
            });
        }
    }, 500);
    window.onDidChangeActiveTextEditor(checkFn);
    window.onDidChangeTextEditorSelection(checkFn);
    workspace.onDidChangeTextDocument(e => {
        if (e.document === window.activeTextEditor?.document) {
            checkFn();
        }
    });
    checkFn();
}

/** 检查是否需要更新变量颜色 */
export function checkIsNeedUpdateColor() {
    const activeTextEditor = window.activeTextEditor;
    const document = activeTextEditor?.document;
    if (!document) {
        return false;
    }
    const documentPath = document.uri.fsPath;

    return SUPPORT_FILES.concat('vue').some(suffix => extname(documentPath).slice(1) === suffix) && documentPath;
}

const textEditorDecorationType = window.createTextEditorDecorationType({});

/** 匹配变量的正则 */
const varReg = /([@$]|(?<=var\()--)[a-z\d-_]+(?=[\s;)])(?!:)/gi;

/** 更新文档颜色显示 */
export function updateColor({ uri, colorMap }: ShowColorBlockParams) {
    const { activeTextEditor } = window;
    const document = activeTextEditor?.document;
    if (!document) {
        return;
    }

    // 打开的文件和解析的颜色映射表不匹配，直接 return
    if (document.uri.fsPath !== uri) {
        return;
    }

    const text = document.getText();
    const decorations: DecorationOptions[] = [];
    for (const item of text.matchAll(varReg)) {
        let [varName = ''] = item;
        if (varName.startsWith('--')) {
            varName = varName.slice(2);
        }
        const { index } = item;
        if (!colorMap[varName]) {
            continue;
        }

        // 处理变量套娃行为，解析出最根的颜色
        let color = colorMap[varName];
        while (colorMap[color]) {
            color = colorMap[color];
        }

        // 跳过不是颜色的变量
        if (!colorChecker(color)) {
            continue;
        }

        const range = new Range(document.positionAt(index), document.positionAt(index + varName.length));
        decorations.push({
            range,
            renderOptions: getColorBlock(color)
        });
    }

    activeTextEditor.setDecorations(textEditorDecorationType, decorations);
}

function getColorBlock(color: string) {
    const block: DecorationOptions['renderOptions']['before'] = {
        backgroundColor: color,
        contentText: '',
        border: '1px solid #fff',
        width: '12px',
        height: '12px',
        margin: '0 4px 0 0'
    };

    const option: DecorationOptions['renderOptions'] = {
        light: {
            before: {
                ...block,
                borderColor: '#000'
            }
        },
        dark: {
            before: {
                ...block,
                borderColor: '#fff'
            }
        }
    };

    return option;
}
