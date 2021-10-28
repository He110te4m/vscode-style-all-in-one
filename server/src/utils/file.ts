import { existsSync, readdirSync, statSync } from 'fs';
import { dirname, extname, isAbsolute, join } from 'path';
import { getAliases, getRootDir } from './config';

const EXCLUDE_FILES = ['.', '..'];

export function getRealPath(path: string, base = getRootDir()) {
    if (checkPath(path)) {
        return path;
    }

    const baseDir = statSync(base).isDirectory() ? base : dirname(base);

    const aliasPath = parserPathByAliases(path, getAliases());
    const npmPath = parserPackagePath(path);
    const realPath = join(baseDir, path);
    const absPath = checkPath(aliasPath)
        ? aliasPath
        : checkPath(npmPath)
        ? npmPath
        : realPath;

    return absPath;
}

function checkPath(path: string) {
    return isAbsolute(path) && existsSync(path);
}

function parserPathByAliases(path: string, aliases: Record<string, string>) {
    let absPath = path;
    const matchAliases = Object.keys(aliases).filter((alias) =>
        path.startsWith(alias)
    );
    if (matchAliases.length) {
        const [alias] = matchAliases;
        const newPath = join(aliases[alias], path.substr(alias.length));
        absPath = isAbsolute(newPath) ? newPath : join(getRootDir(), newPath);
    }

    return absPath;
}

function parserPackagePath(path: string) {
    return join(getRootDir(), 'node_modules', path);
}

export function getAllFile(dir: string, extList?: string[]) {
    dir = getRealPath(dir);
    const stat = statSync(dir);
    if (stat.isFile()) {
        return [dir];
    }

    //根据文件路径读取文件，返回文件列表
    const files = readdirSync(dir);
    let fileNameList: string[] = [];

    // 遍历读取到的文件列表
    files.forEach((filename) => {
        if (EXCLUDE_FILES.includes(filename)) {
            return;
        }

        if (extList && !extList.includes(extname(filename))) {
            return;
        }

        const filedir = join(dir, filename);
        const state = statSync(filedir);

        if (state.isFile()) {
            fileNameList.push(filedir);
        } else if (state.isDirectory()) {
            fileNameList = fileNameList.concat(getAllFile(filedir));
        }
    });

    return fileNameList;
}
