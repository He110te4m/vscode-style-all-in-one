import { debounce } from 'lodash';
import { ExtensionContext, window, workspace } from 'vscode';
import { useClient } from './client';
import { registerCodeLensCommand } from './services/codeLens';
import { useColorService } from './services/color';

let stopClientFn: () => Promise<void> = () => Promise.resolve();

export function activate(context: ExtensionContext) {
  // register code lens command
  context.subscriptions.push(...registerCodeLensCommand());

  // connent language server
  const { client } = useClient(context.asAbsolutePath('.'));

  client.onReady().then(() => {
    // register color server
    const { checkUpdate, updateColor } = useColorService();

    client.onRequest('show-color-blocks', updateColor);

    const checkFn = debounce(() => {
      const path = checkUpdate();
      if (path !== false) {
        client.sendRequest('parse-color-map', {
          path
        });
      }
    }, 500);

    window.onDidChangeActiveTextEditor(checkFn);
    workspace.onDidChangeTextDocument(({ document }) => {
      if (document === window.activeTextEditor?.document) {
        checkFn();
      }
    });

    checkFn();
  });

  stopClientFn = client.stop;
  client.start();
}

export function deactivate() {
  stopClientFn();
}
