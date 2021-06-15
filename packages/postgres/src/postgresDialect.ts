import { getMeta } from '@uql/core/entity/decorator';
import { QueryComparisonOperator, QueryTextSearchOptions, Scalar, Type } from '@uql/core/type';
import { BaseSqlDialect } from '@uql/core/sql';

export class PostgresDialect extends BaseSqlDialect {
  constructor() {
    super('BEGIN', '"');
  }

  override insert<E>(entity: Type<E>, payload: E | E[]): string {
    const sql = super.insert(entity, payload);
    const meta = getMeta(entity);
    const idName = meta.properties[meta.id].name;
    return `${sql} RETURNING ${this.escapeId(idName)} ${this.escapeId('id')}`;
  }

  override compare<E>(entity: Type<E>, key: string, value: Scalar | object, opts: { prefix?: string } = {}): string {
    switch (key) {
      case '$text':
        const meta = getMeta(entity);
        const search = value as QueryTextSearchOptions<E>;
        const fields = search.$fields
          .map((field) => this.escapeId(meta.properties[field]?.name ?? field))
          .join(` || ' ' || `);
        return `to_tsvector(${fields}) @@ to_tsquery(${this.escape(search.$value)})`;
      default:
        return super.compare(entity, key, value, opts);
    }
  }

  override compareOperator<E, K extends keyof QueryComparisonOperator<E>>(
    entity: Type<E>,
    prop: string,
    operator: K,
    val: QueryComparisonOperator<E>[K],
    opts: { prefix?: string } = {}
  ): string {
    const meta = getMeta(entity);
    const prefix = opts.prefix ? `${opts.prefix}.` : '';
    const name = this.escapeId(meta.properties[prop]?.name ?? prop);
    const colPath = prefix + name;
    switch (operator) {
      case '$startsWith':
        return `${colPath} ILIKE ${this.escape(`${val}%`)}`;
      case '$regex':
        return `${colPath} ~ ${this.escape(val)}`;
      default:
        return super.compareOperator(entity, prop, operator, val, opts);
    }
  }
}
