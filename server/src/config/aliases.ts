import { formatPath } from '../helpers/text';

export type Aliases = Record<string, string>;

export function useAliases(defaultAliases: Aliases = {}) {
  const aliases = dealWithAliases(defaultAliases);

  return {
    get: () => aliases,
    set: (aliasMap: Aliases) =>
      Object.assign(aliases, dealWithAliases(aliasMap)),
  };
}

function dealWithAliases(aliases: Aliases) {
  return Object.fromEntries(
    Object.entries(aliases).map(([alias, path]) => [
      formatPath(alias, { suffix: '/' }),
      formatPath(path, { prefix: './', suffix: '/' }),
    ])
  );
}
