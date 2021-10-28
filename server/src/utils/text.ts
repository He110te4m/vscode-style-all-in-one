/**
 * 从 offset 前取出当前行
 */
export function getTextBeforeOffset(text: string, offset: number) {
    let i = offset - 1;
    while (!'\n\r'.includes(text.charAt(i))) {
        i--;
    }
    return text.substring(i + 1, offset);
}

/**
 * 从 offset 后取出当前行
 */
export function getTextAfterOffset(text: string, offset: number) {
    let i = offset + 1;
    while (!'\n\r'.includes(text.charAt(i))) {
        i++;
    }
    return text.substring(i + 1, offset);
}

/** 格式化路径，添加前后缀 */
export function formatPath(
    path: string,
    { suffix, prefix }: { suffix: string; prefix?: string }
) {
    let newPath = path;

    if (prefix && !path.startsWith(prefix)) {
        newPath = `${prefix}${newPath}`;
    }
    if (suffix && !path.endsWith(suffix)) {
        newPath = `${newPath}${suffix}`;
    }

    return newPath;
}
