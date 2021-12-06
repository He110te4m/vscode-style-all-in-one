import { useAliases } from './aliases';
import { useGlobalStyle } from './globalStyle';
import { useRootDir } from './rootDir';

const { get: getAliases, set: setAliases } = useAliases();
const {
  get: getGlobalStyle,
  set: setGlobalStyle,
  getGlobalSymbols,
} = useGlobalStyle();
const { get: getRootDir, set: setRootDir } = useRootDir();

export {
  getAliases,
  setAliases,
  getGlobalStyle,
  setGlobalStyle,
  getGlobalSymbols,
  getRootDir,
  setRootDir,
};
