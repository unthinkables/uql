import { Querier } from './querier';

export type QuerierPoolClass = { new (opts: QuerierPoolOptions): QuerierPool };

export interface QuerierPoolOptions {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port?: number;
}

export interface QuerierPoolConnection {
  query(query: string, ...args: any[]): Promise<any>;
  release(): void | Promise<void>;
}

export interface QuerierPool<E extends Querier = Querier> {
  getQuerier(): Promise<E>;
  end(): Promise<void>;
}
