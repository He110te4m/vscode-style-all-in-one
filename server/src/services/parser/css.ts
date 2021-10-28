import { readFileSync } from 'fs';
import postcss, { ChildNode, Declaration, ProcessOptions, Root, Rule } from 'postcss';

export type CssSymbol = {
    imports: { filepath: string }[];
    variables: (Record<'name' | 'value', string> & {
        offset?: number
    })[];
};
export type CssStore = Record<string, CssSymbol>;

export function parserCss(path: string, isFile = true) {
    let content = path;
    try {
        if (isFile) {
            content = String(readFileSync(path));
        }
    } catch (e) {
        console.error(e);
    }

    return parseSymbols(content, { from: isFile ? path : '' });
}

export function parseSymbols(
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
        console.error(e);
        return cssSymbol;
    }

    root.walkRules((rule) => {
        if (isInsideRoot(rule)) {
            return;
        }

        rule.each((node) => {
            if (isVariableDeclaration(node)) {
                const name = node.prop.slice(2);
                const vars: ValueOf<CssSymbol['variables']> = {
                    name,
                    value: node.value,
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
