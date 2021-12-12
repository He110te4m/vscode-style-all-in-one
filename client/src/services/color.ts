import { extname } from 'path';
import { DecorationOptions, Range, window } from 'vscode';
import { getSupportFiles } from '../config';
import colorChecker from 'css-color-checker';
import { isUndefined } from 'lodash';

type ColorMap = Record<string, string>;

export interface ShowColorBlockParams {
    uri: string;
    colorMap: ColorMap;
}

/** The regexp to match style variables */
const varReg = /([@$]|(?<=var\()--)[a-z\d-_]+(?=[\s;)])(?!:)/gi;

const textEditorDecorationType = window.createTextEditorDecorationType({});

export function useColorService() {
    return {
        checkUpdate: checkUpdateColor,
        updateColor: updateColor
    };
}

/** Check if the color needs to be updated */
function checkUpdateColor() {
    const doc = window.activeTextEditor?.document;
    if (!doc) {
        return false;
    }
    const docPath = doc.uri.fsPath;
    const docExt = extname(docPath).slice(1).toLowerCase();

    return getSupportFiles().concat('vue').includes(docExt) ? docPath : false;
}

/** update document's color */
function updateColor({ uri, colorMap }: ShowColorBlockParams) {
    const { activeTextEditor } = window;
    const doc = activeTextEditor?.document;
    if (!doc) {
        return;
    }

    // The color map doesn't belong to this file.
    if (doc.uri.fsPath !== uri) {
        return;
    }

    // find color's variable to show variable's color
    const text = doc.getText();
    const opts: DecorationOptions[] = [];
    for (const item of text.matchAll(varReg)) {
        const [varName = ''] = item;
        const { index } = item;
        if (isUndefined(index) || !colorMap[varName]) {
          continue;
        }

        // deal with the variable like: `@primaryColor: @blue;`
        let color = colorMap[varName];
        while (colorMap[color]) {
            color = colorMap[color];
        }

        // ignore no color variable
        if (!colorChecker(color)) {
            continue;
        }

        const range = new Range(doc.positionAt(index), doc.positionAt(index + varName.length));
        opts.push({
            range,
            renderOptions: generateColorBlock(color)
        });
    }

    activeTextEditor.setDecorations(textEditorDecorationType, opts);
}

function generateColorBlock(color: string) {
    const block: Exclude<DecorationOptions['renderOptions'], undefined>['before'] = {
        backgroundColor: color,
        contentText: '',
        border: '1px solid',
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
