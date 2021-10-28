/**
 * 取对象/数组的值的类型集合
 */
type ValueOf<TData> = TData extends unknown[]
    ? TData[number]
    : TData extends object
    ? TData[keyof TData]
    : TData;
