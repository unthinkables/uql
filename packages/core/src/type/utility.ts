// export type Type<T> = new (...args: any[]) => T;

export type Scalar = boolean | string | number | BigInt | Date | Symbol;

export interface Type<T> extends Function {
  new (...args: any[]): T;
}

export type Writable<T> = { -readonly [P in keyof T]: T[P] };
