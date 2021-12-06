import {
  commands,
  Position,
  Range,
  window,
  workspace,
  WorkspaceEdit,
} from 'vscode';

const codeLensCommands = {
  convertToName: 'style-all-in-one.convert-value-to-variable',
  convertToValue: 'style-all-in-one.convert-variable-to-value',
} as const;

export function registerCodeLensCommand() {
  return [
    commands.registerCommand(
      codeLensCommands.convertToName,
      ({ name }: { name: string; }, range: Range) => {
        if (name.startsWith('--')) {
          name = `var(${name})`;
        }
        replaceText(range, name);
      }
    ),
    commands.registerCommand(
      codeLensCommands.convertToValue,
      ({ name, value }: { name: string; value: string; }, range: Range) => {
        if (name.startsWith('--')) {
          const { start, end } = range;
          range = new Range(
            new Position(start.line, start.character - 4),
            new Position(end.line, end.character + 1)
          );
        }

        replaceText(range, value);
      }
    ),
  ];
}

function replaceText(range: Range, text: string) {
  if (!window.activeTextEditor) {
    return;
  }

  const edit = new WorkspaceEdit();

  edit.replace(window.activeTextEditor.document.uri, range, text);

  workspace.applyEdit(edit);
}
