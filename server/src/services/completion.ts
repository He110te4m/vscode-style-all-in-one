import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  Position,
  Range,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { getGlobalSymbols } from '../config';
import { EXT_MAP, StyleType } from '../const';
import { getFileSymbols } from '../helpers/parse';
import {
  getTextAfterOffset,
  getTextBeforeOffset,
  getVariableRegExp,
} from '../helpers/text';
import { languageModel } from '../language/cache';
import { StyleSymbol } from '../parser';

export interface CompletionOptions {
  getRange: (prefix: string, suffix: string) => Range | null;
  checkPrefix: (prefix: string) => boolean;
  checkVar?: (name: string, value: string) => boolean;
  renderName?: (name: string) => string;
}

export function getCompleteList(doc: TextDocument, pos: Position) {
  const docPath = URI.parse(doc.uri).fsPath ?? doc.uri;
  if (!docPath) {
    return null;
  }

  const list = CompletionList.create();
  const id = doc.languageId.toLowerCase();
  if (id === 'vue') {
    const regions = languageModel.get(doc);
    const type = regions.getLanguageAtPosition(pos);
    if (!type) {
      return null;
    }
    const styleDoc = regions.getEmbeddedDocument(type);
    list.items.push(...getComplete(styleDoc, pos, type));

    return list;
  } else if (Object.keys(EXT_MAP).includes(id)) {
    const type = EXT_MAP[id];
    list.items.push(...getComplete(doc, pos, type));

    return list;
  }

  return null;
}

function getComplete(doc: TextDocument, pos: Position, type: StyleType) {
  const {
    checkPrefix,
    getRange,
    renderName = (name) => name,
    checkVar = checkPrefix,
  } = getCompletionOptions(pos)[type];

  let list: CompletionItem[] = [];

  const text = doc.getText();
  const offset = doc.offsetAt(pos);
  const prefix = getTextBeforeOffset(text, offset);

  if (checkPrefix?.(prefix) === false) {
    return list;
  }

  const range = getRange?.(prefix, getTextAfterOffset(text, offset));
  if (!range) {
    return list;
  }

  const globalSymbol = Object.values(getGlobalSymbols());
  const fileSymbol = Object.values(getFileSymbols(doc, pos) ?? {});

  list = list.concat(
    getVarsCompletionList(globalSymbol, range, checkVar, renderName),
    getVarsCompletionList(fileSymbol, range, checkVar, renderName)
  );

  return list;
}

const cssReplaceFlags = ['var(', ' -', ':-', '--', '#'];

function getCompletionOptions(
  pos: Position
): Record<StyleType, CompletionOptions> {
  return {
    [StyleType.less]: getPreStyleOptions('@'),
    [StyleType.scss]: getPreStyleOptions('#'),
    [StyleType.css]: {
      checkPrefix: (prefix) =>
        getVariableRegExp('(var\\()?--?', '\\)').test(prefix),
      checkVar: label => /var\(--[^@$]/.test(label),
      renderName: (name) => `var(${name})`,
      getRange: (prefix, suffix) => {
        let range: Range | null = null;
        for (const text of cssReplaceFlags) {
          const idx = prefix.lastIndexOf(text);

          if (idx > -1) {
            range = Range.create(
              Position.create(pos.line, text.startsWith(' ') ? idx + 1 : idx),
              pos
            );
            break;
          }
        }

        if (!range) {
          return null;
        }

        // Contains ')', need to replace ')' together
        if (suffix.startsWith(')')) {
          range.end.character = range.end.character + 1;
        }

        return range;
      },
    },
  };

  function getPreStyleOptions(variablePrefix: string): CompletionOptions {
    return {
      checkPrefix: (prefix) => getVariableRegExp(variablePrefix).test(prefix),
      getRange: (prefix) => {
        const varPrefixIdx = prefix.lastIndexOf(variablePrefix);
        const colorPrefixIdx = prefix.lastIndexOf('#');
        const idx = Math.max(varPrefixIdx, colorPrefixIdx);

        if (idx < 0) {
          return null;
        }

        return Range.create(Position.create(pos.line, idx), pos);
      },
    };
  }
}

function getVarsCompletionList(
  symbolList: StyleSymbol[],
  range: Range,
  checkVar: (name: string, value: string) => boolean,
  formatName: (name: string) => string = (name) => name
) {
  return symbolList.reduce((list, item) => {
    return list.concat(
      ...item!.variables.map(({ name, value }): CompletionItem[] => {
        const label = formatName(name);

        if (!checkVar(label, value)) {
          return [];
        }

        return [
          {
            label,
            detail: `${label} value is ${value}`,
            textEdit: {
              newText: label,
              range,
            },
            kind: CompletionItemKind.Variable,
          },
          {
            label: value,
            detail: `${label} value is ${value}`,
            textEdit: {
              newText: label,
              range,
            },
            kind: CompletionItemKind.Variable,
          },
        ];
      })
    );
  }, [] as CompletionItem[]);
}
