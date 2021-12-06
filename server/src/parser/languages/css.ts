import type { IVariable } from 'less-symbols-parser';
import postcss, {
  ChildNode,
  Declaration,
  ProcessOptions,
  Root,
  Rule,
} from 'postcss';

export type CssSymbol = {
  imports: { filepath: string; }[];
  variables: IVariable[];
};
export type CssStore = Record<string, CssSymbol>;

export function parserCss(content: string, path: string) {
  return parseSymbols(content, { from: path });
}

function parseSymbols(
  css: string,
  options?: Pick<ProcessOptions, 'from'>
) {
  const cssSymbol: CssSymbol = {
    imports: [],
    variables: [],
  };
  let root: Root | null = null;
  try {
    root = postcss.parse(css, {
      from: options?.from,
    });
  } catch (e) {
    console.error(
      `[style-all-in-one]: 文件 ${options?.from ?? 'unknown file'} 解析失败：`,
      e
    );
    return cssSymbol;
  }

  root.walkRules((rule) => {
    if (isInsideRoot(rule)) {
      return;
    }

    rule.each((node) => {
      if (isVariableDeclaration(node)) {
        const name = node.prop;
        const vars: ValueOf<CssSymbol['variables']> = {
          name,
          value: node.value,
          offset: 0
        };
        if (node.source?.start) {
          vars.offset = node.source.start.offset;
        }

        cssSymbol.variables.push(vars);
      }
    });
  });

  root.walkAtRules('import', (rule) => {
    const value = rule.params.trim();
    const path = value.match(/['"](.*)['"]/)?.[1];
    cssSymbol.imports.push({
      filepath: path ?? value,
    });
  });

  return cssSymbol;
}

function isInsideRoot(rule: Rule) {
  return (
    rule.selectors.length !== 1 ||
    rule.selectors[0] !== ':root' ||
    rule.parent?.type !== 'root'
  );
}

function isVariableDeclaration(decl: ChildNode): decl is Declaration {
  return decl.type === 'decl' && !!decl.value && decl.prop.startsWith('--');
}
