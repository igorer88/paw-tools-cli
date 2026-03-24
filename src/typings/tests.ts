// biome-ignore lint/suspicious/noExplicitAny: utility type for accessing private members in tests
export type Testable<T> = T & { [key: string]: (...args: any[]) => any }
