import { QuerierPoolConnection } from '../../type';
import { BaseSqlQuerier } from '../baseSqlQuerier';
import { MySqlDialect } from './mysqlDialect';

export class MySqlQuerier extends BaseSqlQuerier {
  constructor(conn: QuerierPoolConnection) {
    super(new MySqlDialect(), conn);
  }

  processQueryResult<T>([rows]: [T]): T {
    return rows;
  }
}
