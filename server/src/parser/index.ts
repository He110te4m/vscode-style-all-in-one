import { readFileSync } from 'fs';
import { isArray, mergeWith } from 'lodash';
import { extname } from 'path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { EXT_MAP, StyleType } from '../const';
import { getRealPath, getFileStyleType } from '../helpers/file';
import { languageModel } from '../language/cache';
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

      symbol = parseStyleByContent(content, absPath);
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

export function parseStyleByContent(content: string, path: string) {
  let symbol: StyleSymbol = {
    variables: [],
    imports: [],
  };

  const contentList: [string, StyleType][] = [];

  const ext = extname(path).slice(1);
  if (ext === 'vue') {
    const regions = languageModel.get(
      TextDocument.create(path, 'vue', 1, String(readFileSync(path)))
    );
    const types = regions.getLanguagesInDocument();
    types.forEach(type => {
      contentList.push([regions.getEmbeddedDocument(type).getText(), type]);
    });
  } else if (Object.keys(EXT_MAP).includes(ext)) {
    contentList.push([content, EXT_MAP[ext]]);
  }

  contentList.forEach(([content, type]) => {
    let data: StyleSymbol = {
      variables: [],
      imports: [],
    };
    switch (type) {
      case StyleType.css:
        data = parserCss(content, path);
        break;

      case StyleType.less:
        data = parserLess(content, path);
        break;

      case StyleType.scss:
        data = parserScss(content, path);
        break;

      default:
        break;
    }

    symbol = mergeWith(symbol, data, (objValue, srcValue) => {
      if (isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    });
  });

  return symbol;
}
