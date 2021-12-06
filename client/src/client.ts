import { resolve } from 'path';
import { workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';
import { getExtInfo, getSupportFiles, getWorkspaceFolder } from './config';

export function useClient(rootPath: string) {
  /** get server entry */
  const serverModule = resolve(rootPath, 'server/out/main.js');

  /** debugger config */
  const debugOptions = { execArgv: ['--nolazy', '--inspect=4397'] };

  /** server common config */
  const serverConfig = {
    module: serverModule,
    transport: TransportKind.ipc
  };

  /**
   * server config
   */
  const serverOptions: ServerOptions = {
    run: { ...serverConfig },
    debug: {
      ...serverConfig,
      options: debugOptions
    }
  };

  // get support file suffix
  const supportFiles = getSupportFiles();

  /** client config */
  const clientOptions: LanguageClientOptions = {
    /** register file watcher */
    documentSelector: [{ scheme: 'file', language: 'vue' }].concat(
      supportFiles.map(suffix => ({
        scheme: 'file',
        language: suffix
      }))
    ),
    initializationOptions: {
      // send workspace folder to server
      rootDir: getWorkspaceFolder()
    },
    synchronize: {
      // sync file change event to server
      configurationSection: 'style-all-in-one',
      fileEvents: supportFiles.map(suffix => workspace.createFileSystemWatcher(`**/*.${suffix}`))
    }
  };

  // create client by config
  const { id, name } = getExtInfo();
  const client = new LanguageClient(id, name, serverOptions, clientOptions);

  return {
    client
  };
}
