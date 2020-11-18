import {
  RelationOptions,
  RelationOneToOneOptions,
  RelationOneToManyOptions,
  RelationManyToOneOptions,
  RelationManyToManyOptions,
} from '../../type';
import { defineRelation, defineProperty } from './definition';

function Relation<T>(opts: RelationOptions<T>) {
  return (target: object, prop: string) => {
    const type = target.constructor as { new (): T };
    if (opts.cardinality === 'manyToOne' || opts.cardinality === 'oneToOne') {
      defineProperty(type, prop, {});
    }
    defineRelation(type, prop, opts);
  };
}

export function OneToOne<T>(opts: RelationOneToOneOptions<T>): ReturnType<typeof Relation> {
  return Relation({ cardinality: 'oneToOne', ...opts });
}

export function ManyToOne<T>(opts?: RelationManyToOneOptions<T>): ReturnType<typeof Relation> {
  return Relation({ cardinality: 'manyToOne', ...opts });
}

export function OneToMany<T>(opts: RelationOneToManyOptions<T>): ReturnType<typeof Relation> {
  return Relation({ cardinality: 'oneToMany', ...opts });
}

// export function ManyToMany<T>(opts: RelationManyToManyOptions<T>): ReturnType<typeof Relation> {
//   return Relation({ cardinality: 'manyToMany', ...opts });
// }
