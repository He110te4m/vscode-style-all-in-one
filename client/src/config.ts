import { workspace } from 'vscode';

export type Aliases = Record<string, string>;

const namespace = 'style-all-in-one';

/**
 * 获取配置信息
 * @param key 配置项名
 */
function getConfig<T>(key: string): T | undefined {
    return workspace.getConfiguration(namespace).get(key);
}

export function getWorkspaceFolder(): string {
    const rootDir = workspace.workspaceFolders?.[0];
    if (!rootDir) {
        throw new Error(`[${namespace}]: 请先打开文件夹，在文件夹内使用本插件`);
    }

    return rootDir.uri.fsPath;
}

let aliases: Aliases = null;

export function getPathAliases() {
    if (aliases) {
        return aliases;
    }

    aliases = getConfig('path-aliases') ?? {};

    return aliases;
}
