import { StyleType } from '../const';
import { getGlobalStylePath } from '../utils/config';
import { parserStyle, Store } from './parser';

export function getGlobalStyleByLang<TKind extends StyleType>(
    type: TKind
): Record<string, ValueOf<Store[TKind]>> {
    return parserStyle(getGlobalStylePath(), {
        limit: [type],
    }) as Record<string, ValueOf<Store[TKind]>>;
}
