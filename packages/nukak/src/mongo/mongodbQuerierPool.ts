import { MongoClient, MongoClientOptions } from 'mongodb';
import { QuerierLogger, QuerierPool } from 'nukak/type/index.js';
import { MongodbQuerier } from './mongodbQuerier.js';
import { MongoDialect } from './mongoDialect.js';

export class MongodbQuerierPool implements QuerierPool<MongodbQuerier> {
  private readonly client: MongoClient;

  constructor(uri: string, opts?: MongoClientOptions, readonly logger?: QuerierLogger) {
    this.client = new MongoClient(uri, opts);
  }

  async getQuerier() {
    const conn = await this.client.connect();
    const querier = new MongodbQuerier(new MongoDialect(), conn, this.logger);
    return querier;
  }

  async end() {
    await this.client.close();
  }
}
