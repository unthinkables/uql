import { Type } from './utility';

export type Properties<E> = {
  [K in keyof E]: E[K] extends object ? never : K;
}[keyof E];

export type Relations<E> = {
  [K in keyof E]: E[K] extends object ? K : never;
}[keyof E];

export type EntityOptions = {
  readonly name?: string;
};

export type PropertyOptions = {
  readonly name?: string;
  readonly isId?: true;
  readonly type?: any;
  readonly reference?: EntityGetter | ReferenceOptions;
  readonly onInsert?: () => any;
  readonly onUpdate?: () => any;
};

export type EntityGetter<E = any> = () => Type<E>;
export type ReferenceOptions<E = any> = { entity: EntityGetter<E> };
type IdOptions = PropertyOptions & { readonly property: string };

export type RelationOptions<E> = {
  entity?: EntityGetter<E>;
  readonly cardinality: RelationCardinality;
  mappedBy?: RelationMappedBy<E>;
  through?: string;
  references?: { source: string; target: string }[];
};

export type PropertyNameMap<E> = { readonly [K in keyof E]: K };
export type PropertyNameMapper<E> = (namesMap: PropertyNameMap<E>) => string;
export type RelationMappedBy<E> = E extends object ? keyof E | PropertyNameMapper<E> : string;
export type RelationCardinality = 'oneToOne' | 'manyToOne' | 'oneToMany' | 'manyToMany';
export type RelationOneToOneOptions<E> = { entity?: EntityGetter<E>; mappedBy?: RelationMappedBy<E> };
export type RelationOneToManyOptions<E> = { entity: EntityGetter<E>; mappedBy?: RelationMappedBy<E> };
export type RelationManyToOneOptions<E> = { entity?: EntityGetter<E>; mappedBy?: RelationMappedBy<E> };
export type RelationManyToManyOptions<E> = { entity: EntityGetter<E>; mappedBy?: RelationMappedBy<E> };

export type EntityMeta<E> = {
  readonly entity: Type<E>;
  name: string;
  id?: IdOptions;
  properties: {
    [key: string]: PropertyOptions;
  };
  relations: {
    [key: string]: RelationOptions<E>;
  };
  processed?: boolean;
};
