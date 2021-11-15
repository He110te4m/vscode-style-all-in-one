import { existsSync, statSync } from 'fs';
import { isFunction } from 'lodash';
import { getAllFile, getRealPath } from './file';
import { formatPath } from './text';

export interface Config {
    aliases: Record<string, string>;
    globalStyle: string[];
    rootDir: string;
}

const config: Config = {
    aliases: {},
    globalStyle: [],
    rootDir: '',
};

const allowExtNames = ['.less', '.css', '.pcss', '.postcss', '.scss', '.sass'];

export function setGlobalStylePath(paths: string[]) {
    config.globalStyle = paths.reduce((list, path) => {
        return list.concat(getAllFile(path, allowExtNames));
    }, [] as string[]);
}

export function getGlobalStylePath() {
    return config.globalStyle;
}

export function setRootDir(path: string) {
    config.rootDir = path;
}

export function getRootDir() {
    return config.rootDir;
}

export function setAliases(aliases: Record<string, string>) {
    config.aliases = Object.fromEntries(
        Object.entries(aliases).map(([alias, path]) => {
            return [
                formatPath(alias, { suffix: '/' }),
                formatPath(path, { prefix: './', suffix: '/' }),
            ];
        })
    );
}

export function getAliases() {
    return config.aliases;
}
