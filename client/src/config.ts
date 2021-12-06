import { workspace } from 'vscode';

export type Aliases = Record<string, string>;

/** Extension's namespace */
const namespace = 'style-all-in-one';

/** The suffix which extension supported  */
const defaultSupportFiles = ['css', 'less', 'sass', 'scss', 'pcss', 'postcss'];

/**
 * get config by key
 * @param key config key
 */
function getConfig<T>(key: string): T | undefined {
  return workspace.getConfiguration(namespace).get(key);
}

/** get workspace root direction */
export function getWorkspaceFolder(): string {
  const rootDir = workspace.workspaceFolders?.[0];
  if (!rootDir) {
    throw new Error(`[${namespace}]: 请先打开文件夹，在文件夹内使用本插件`);
  }

  return rootDir.uri.fsPath;
}

/** Get extension info */
export function getExtInfo(): Record<'id' | 'name', string> {
  return {
    id: namespace,
    name: namespace.replace('-', ' '),
  };
}

/** get all support suffix */
export function getSupportFiles(): string[] {
  return defaultSupportFiles;
}
