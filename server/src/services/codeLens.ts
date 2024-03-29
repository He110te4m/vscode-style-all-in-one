import { IVariable } from 'less-symbols-parser';
import { isEqual, isUndefined, uniqWith } from 'lodash';
import { CodeLens, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { getGlobalSymbols } from '../config';
import { EXT_MAP } from '../const';
import { getFileSymbols } from '../helpers/parse';
import { languageModel } from '../language/cache';
import { StyleSymbol } from '../parser';

const commands = {
  convertToName: 'style-all-in-one.convert-value-to-variable',
  convertToValue: 'style-all-in-one.convert-variable-to-value',
} as const;

interface CodeLensOption {
  isEnableVarToValue: boolean;
}

let codeLensOptions: CodeLensOption | undefined;

export function getCodeLens(doc: TextDocument, options: CodeLensOption) {
  const docPath = URI.parse(doc.uri).fsPath ?? doc.uri;
  if (!docPath) {
    return null;
  }

  codeLensOptions = options;

  let list: CodeLens[] = [];

  const id = doc.languageId.toLowerCase();
  if (id === 'vue') {
    const regions = languageModel.get(doc);
    const types = regions.getLanguagesInDocument();
    if (!types.length) {
      return null;
    }
    const globalSymbol = Object.values(getGlobalSymbols());
    types.forEach((type) => {
      const styleDoc = regions.getEmbeddedDocument(type);

      list = getCodeLensBySymbol(styleDoc, globalSymbol);
    });

    return list;
  } else if (Object.keys(EXT_MAP).includes(id)) {
    const type = EXT_MAP[id];

    const globalSymbol = Object.values(
      getGlobalSymbols({
        limit: [type],
      })
    );

    list = getCodeLensBySymbol(doc, globalSymbol);

    return list;
  }

  return null;
}

function getCodeLensBySymbol(doc: TextDocument, globalSymbol: StyleSymbol[]) {
  const docPath = URI.parse(doc.uri).fsPath ?? doc.uri;
  if (!docPath) {
    return [];
  }

  const content = doc.getText();
  const fileSymbol = Object.values(getFileSymbols(content, docPath) ?? {});

  const symbols = globalSymbol.concat(fileSymbol);

  let variables = symbols
    .reduce((list, item) => list.concat(item.variables), [] as IVariable[])
    .filter(
      (item) => content.includes(item.name) || content.includes(item.value)
    );

  variables = uniqWith(variables, isEqual);

  return getCodeLensByVariables(content, variables, doc);
}

function getCodeLensByVariables(
  content: string,
  variables: IVariable[],
  doc: TextDocument
) {
  const list: CodeLens[] = [];

  variables.forEach((item) => {
    list.push(...getVariableCodeLens(content, item, doc));
  });

  return list;
}

function getVariableCodeLens(
  content: string,
  variable: IVariable,
  doc: TextDocument
) {
  const { isEnableVarToValue } = codeLensOptions ?? {};
  const matches = content.matchAll(
    new RegExp(
      `${variable.name}(?![:\\-_])|(?<!${variable.name}:\\s*)(?<!\\w+)${variable.value}(?=[;\\s\\)])`,
      'g'
    )
  );

  const list: CodeLens[] = [];

  for (const match of matches) {
    if (isUndefined(match.index)) {
      continue;
    }
    const [item] = match;
    const { index } = match;

    const isValue = item === variable.value;
    if (!isEnableVarToValue && !isValue) {
      continue;
    }

    const range = Range.create(
      doc.positionAt(index),
      doc.positionAt(
        index + (!isValue ? variable.name.length : variable.value.length)
      )
    );

    list.push({
      range,
      command: {
        title: `use style variable ( ${variable.name} ) ${isValue ? '☐' : '☑'}`,
        command: isValue ? commands.convertToName : commands.convertToValue,
        arguments: [variable, range],
      },
    });
  }

  return list;
}
