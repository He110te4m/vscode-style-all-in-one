import { readFileSync } from 'fs';
import { StyleType } from '../const';
import { getRealPath, getFileStyleType } from '../helpers/file';
import { CssStore, parserCss } from './languages/css';
import { LessStore, parserLess } from './languages/less';
import { ScssStore, parserScss } from './languages/scss';

export interface Store {
  [StyleType.css]: CssStore;
  [StyleType.less]: LessStore;
  [StyleType.scss]: ScssStore;
}

export type StyleSymbol = ValueOf<ValueOf<Store>>;

export const store: Store = {
  [StyleType.css]: {},
  [StyleType.less]: {},
  [StyleType.scss]: {},
};

export function clearCache() {
  (Object.keys(store) as StyleType[]).forEach((type) => {
    store[type] = {};
  });
}

export interface StyleParserOptions {
  /** 限制提取哪种类型的文件信息 */
  limit?: StyleType[];
  /** 是否忽略已有缓存，强制重新解析文件 */
  ignoreCache?: boolean;
}

export function parseStyle(
  file: string | string[],
  opts: StyleParserOptions = {}
) {
  const fileList = ([] as string[]).concat(file);
  const { limit, ignoreCache = false } = opts;

  return fileList.reduce((obj, path) => {
    const absPath = getRealPath(path);
    let info = obj;

    const type = getFileStyleType(absPath);

    let symbol: StyleSymbol;
    if (!ignoreCache && store[type][absPath]) {
      symbol = store[type][absPath];
    } else {
      let content = '';

      try {
        content = readFileSync(absPath).toString();
      } catch (e) {
        return obj;
      }

      symbol = parseStyleByContent(content, absPath, type);
    }

    store[type][absPath] = symbol;
    if (!limit || limit.includes(type)) {
      info[absPath] = symbol;
    }

    if (symbol.imports.length) {
      info = {
        ...info,
        ...parseStyle(
          symbol.imports
            .filter(
              (item) =>
                !limit || limit.includes(getFileStyleType(item.filepath))
            )
            .map((item) => getRealPath(item.filepath, absPath))
        ),
      };
    }

    return info;
  }, {} as Record<string, StyleSymbol>);
}

export function parseStyleByContent(content: string, path: string, type: StyleType) {
  let symbol: StyleSymbol = {
    variables: [],
    imports: [],
  };

  switch (type) {
    case StyleType.css:
      symbol = parserCss(content, path);
      break;

    case StyleType.less:
      symbol = parserLess(content, path);
      break;

    case StyleType.scss:
      symbol = parserScss(content, path);
      break;

    default:
      break;
  }

  return symbol;
}
