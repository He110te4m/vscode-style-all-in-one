import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname, isAbsolute, dirname } from 'path';
import { EXT_MAP, StyleType } from '../const';
import { getAliases, getRootDir } from '../config';

const excludeFiles = ['.', '..'];

export function getAllFile(dir: string, extList?: string[]) {
  dir = getRealPath(dir);
  const stat = statSync(dir);
  if (stat.isFile()) {
    return [dir];
  }

  // Read the file according to the file path and return the file list.
  const files = readdirSync(dir);
  let fileNameList: string[] = [];

  // Traverse the list of read files.
  files.forEach((filename) => {
    if (excludeFiles.includes(filename)) {
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

export function getFileStyleType(path: string) {
  const ext = extname(path).slice(1);

  return EXT_MAP[ext] ?? StyleType.css;
}

export function getRealPath(path: string, base = getRootDir()) {
  if (checkPath(path)) {
    return path;
  }

  // Compatible with lower versions less-loader
  if (path.startsWith('~')) {
    path = path.slice(1);
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

function parserPathByAliases(path: string, aliases: Record<string, string>) {
  let absPath = path;
  const matchAliases = Object.keys(aliases).filter((alias) =>
    path.startsWith(alias)
  );
  if (matchAliases.length) {
    const [alias] = matchAliases;
    const newPath = join(aliases[alias], path.slice(alias.length));
    absPath = isAbsolute(newPath) ? newPath : join(getRootDir(), newPath);
  }

  return absPath;
}

function parserPackagePath(path: string) {
  return join(getRootDir(), 'node_modules', path);
}

function checkPath(path: string) {
  return isAbsolute(path) && existsSync(path);
}
