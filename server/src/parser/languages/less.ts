import { parseSymbols } from 'less-symbols-parser';

export type LessSymbol = ReturnType<typeof parseSymbols>;
export type LessStore = Record<string, LessSymbol>;

export function parserLess(content: string, path: string) {
  let lessSymbol: LessSymbol = {
    imports: [],
    variables: [],
    mixins: [],
  };

  try {
    lessSymbol = parseSymbols(content);
  } catch (e) {
    console.error(`[style-all-in-one]: 文件 ${path} 解析失败：`, e);
  }

  return lessSymbol;
}
