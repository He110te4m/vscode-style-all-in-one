import { getAllFile } from '../helpers/file';
import { parseStyle, StyleParserOptions } from '../parser';

export function useGlobalStyle(paths: string[] = []) {
  let globalStyleFileList: string[] = flatPaths(paths);

  return {
    get: () => globalStyleFileList,
    set: (paths: string[]) =>
      (globalStyleFileList = globalStyleFileList.concat(flatPaths(paths))),
    getGlobalSymbols: (opts: StyleParserOptions = {}) => {
      return parseStyle(globalStyleFileList, opts);
    },
  };
}

const allowExtNames = ['.less', '.css', '.pcss', '.postcss', '.scss', '.sass'];

function flatPaths(paths: string[]) {
  return paths.reduce((list, path) => {
    return list.concat(getAllFile(path, allowExtNames));
  }, [] as string[]);
}
