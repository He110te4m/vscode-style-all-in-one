import { parseSymbols } from 'scss-symbols-parser';

export type ScssSymbol = ReturnType<typeof parseSymbols>;
export type ScssStore = Record<string, ScssSymbol>;

export function parserScss(content: string, path: string) {
  let scssSymbol: ScssSymbol = {
    imports: [],
    variables: [],
    mixins: [],
    functions: [],
  };

  try {
    scssSymbol = parseSymbols(content);
  } catch (e) {
    console.error(`[style-all-in-one]: 文件 ${path} 解析失败：`, e);
  }

  return scssSymbol;
}
