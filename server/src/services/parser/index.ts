import { extname } from 'path';
import { EXT_MAP, StyleType } from '../../const';
import { getRealPath } from '../../utils/file';
import { CssStore, parserCss } from './css';
import { LessStore, parserLess } from './less';
import { ScssStore, parserScss } from './scss';

export interface Store {
    [StyleType.html]: null;
    [StyleType.css]: CssStore;
    [StyleType.less]: LessStore;
    [StyleType.scss]: ScssStore;
}

export type StyleSymbol = ValueOf<ValueOf<Store>>;

export const store: Store = {
    [StyleType.html]: null,
    [StyleType.css]: {},
    [StyleType.less]: {},
    [StyleType.scss]: {},
};

export function clearCache() {
    const clearLangs: Exclude<StyleType, StyleType.html>[] = [
        StyleType.css,
        StyleType.less,
        StyleType.scss,
    ];

    clearLangs.forEach((type) => {
        store[type] = {};
    });
}

export interface ParserStyleOptions {
    /** 限制提取哪种类型的文件信息 */
    limit?: StyleType[];
    /** 是否忽略已有缓存，强制重新解析文件 */
    ignoreCache?: boolean;
}

export function parserStyle(files: string[], opts: ParserStyleOptions = {}) {
    const { limit, ignoreCache = false } = opts;

    const data = files.reduce((obj, path) => {
        const absPath = getRealPath(path);
        let info = obj;

        const type = getFileStyleType(absPath);
        const symbol = getSymbol(absPath, type, ignoreCache);
        if (!symbol) {
            return info;
        }

        if (store[type]) {
            store[type]![absPath] = symbol;
        }

        if (!limit || limit.includes(type)) {
            info[absPath] = symbol;
        }

        if (symbol.imports?.length) {
            info = {
                ...info,
                ...parserStyle(
                    symbol.imports
                        .filter(
                            (item) =>
                                !limit ||
                                limit.includes(getFileStyleType(item.filepath))
                        )
                        .map((item) => getRealPath(item.filepath, absPath)),
                    opts
                ),
            };
        }

        return info;
    }, {} as Record<string, StyleSymbol>);
    return data;
}

export function parserStyleByContent(
    content: string,
    absPath: string,
    type: StyleType
) {
    let info: Record<string, StyleSymbol> = {};

    const symbol = getSymbolByType(content, type, false);
    if (!symbol) {
        return info;
    }

    if (symbol.imports?.length) {
        info = {
            ...info,
            ...parserStyle(
                symbol.imports
                    .filter((item) => getFileStyleType(item.filepath) === type)
                    .map((item) => getRealPath(item.filepath, absPath)),
                { limit: [type] }
            ),
        };
    }

    return info;
}

function getSymbol(path: string, type: StyleType, ignoreCache = false) {
    if (!ignoreCache && store[type]?.[path]) {
        return store[type]![path];
    }

    return getSymbolByType(path, type);
}

function getSymbolByType(path: string, type: StyleType, isFile = true) {
    let symbol: StyleSymbol = null;

    switch (type) {
        case StyleType.css:
            symbol = parserCss(path, isFile);
            break;

        case StyleType.less:
            symbol = parserLess(path, isFile);
            break;

        case StyleType.scss:
            symbol = parserScss(path, isFile);
            break;

        default:
            break;
    }

    return symbol;
}

function getFileStyleType(path: string) {
    const ext = extname(path).slice(1);

    return EXT_MAP[ext] ?? StyleType.css;
}
