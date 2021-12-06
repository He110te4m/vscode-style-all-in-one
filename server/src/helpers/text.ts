import { isAbsolute } from 'path';

/**
 * Fetch the current row before offset
 */
export function getTextBeforeOffset(text: string, offset: number) {
  let i = offset - 1;
  while (!'\n\r'.includes(text.charAt(i))) {
    i--;
  }
  return text.substring(i + 1, offset);
}

/**
 * Fetch the current row after offset
 */
export function getTextAfterOffset(text: string, offset: number) {
  let i = offset + 1;
  while (!'\n\r'.includes(text.charAt(i))) {
    i++;
  }
  return text.substring(i + 1, offset);
}

/** Format the path, add prefixes and suffixes */
export function formatPath(
  path: string,
  { suffix, prefix }: { suffix: string; prefix?: string; }
) {
  let newPath = path;
  const isAbs = isAbsolute(newPath);

  if (!isAbs && prefix && !path.startsWith(prefix)) {
    newPath = `${prefix}${newPath}`;
  }
  if (suffix && !path.endsWith(suffix)) {
    newPath = `${newPath}${suffix}`;
  }

  return newPath;
}

/** Generate variable prefix verification regular expression */
export function getVariableRegExp(prefix: string, suffix = '') {
  return new RegExp(`${prefix}|#[a-z-_]*${suffix + '?'}$`, 'i');
}
