import { MongoClient, ClientSession, ObjectId } from 'mongodb';
import { isDebug, log } from '@uql/core';
import { Query, EntityMeta, QueryOne, Type, QueryCriteria } from '@uql/core/type';
import { BaseQuerier } from '@uql/core/querier';
import { getMeta } from '@uql/core/entity/decorator';
import { buildPersistable, buildPersistables } from '@uql/core/entity/util';
import { clone, hasKeys, getKeys } from '@uql/core/util';
import { MongoDialect } from './mongoDialect';

export class MongodbQuerier extends BaseQuerier {
  private session: ClientSession;

  constructor(readonly conn: MongoClient, readonly dialect = new MongoDialect()) {
    super();
  }

  override count<E>(entity: Type<E>, qm: QueryCriteria<E> = {}) {
    const filter = this.dialect.filter(entity, qm.$filter);
    log('count', entity.name, filter);
    return this.collection(entity).countDocuments(filter, {
      session: this.session,
    });
  }

  override async findMany<E>(entity: Type<E>, qm: Query<E>) {
    const meta = getMeta(entity);

    let documents: E[];

    if (hasKeys(qm.$populate)) {
      const pipeline = this.dialect.aggregationPipeline(entity, qm);
      if (isDebug()) {
        log('findMany', entity.name, JSON.stringify(pipeline, null, 2));
      }
      documents = await this.collection(entity).aggregate<E>(pipeline, { session: this.session }).toArray();
      normalizeIds(documents, meta);
      await this.populateToManyRelations(entity, documents, qm.$populate);
    } else {
      const cursor = this.collection(entity).find<E>({}, { session: this.session });

      if (qm.$filter) {
        const filter = this.dialect.filter(entity, qm.$filter);
        cursor.filter(filter);
      }
      if (qm.$project) {
        cursor.project(this.dialect.project(qm.$project));
      }
      if (qm.$sort) {
        cursor.sort(qm.$sort);
      }
      if (qm.$skip) {
        cursor.skip(qm.$skip);
      }
      if (qm.$limit) {
        cursor.limit(qm.$limit);
      }

      log('findMany', entity.name, qm);

      documents = await cursor.toArray();
      normalizeIds(documents, meta);
    }

    return documents;
  }

  override findOneById<E>(entity: Type<E>, id: ObjectId, qo: QueryOne<E>) {
    const meta = getMeta(entity);
    return this.findOne(entity, { ...qo, $filter: { [meta.id]: id } });
  }

  override async insertMany<E>(entity: Type<E>, payload: E[]) {
    if (payload.length === 0) {
      return;
    }

    payload = clone(payload);

    const meta = getMeta(entity);
    const payloads = Array.isArray(payload) ? payload : [payload];
    const persistables = buildPersistables(meta, payloads, 'onInsert');

    log('insertMany', entity.name, persistables);

    const { insertedIds } = await this.collection(entity).insertMany(persistables, { session: this.session });

    const ids = Object.values(insertedIds);

    payloads.forEach((it, index) => {
      it[meta.id] = ids[index];
    });

    await this.insertRelations(entity, payloads);

    return ids;
  }

  override async updateMany<E>(entity: Type<E>, payload: E, qm: QueryCriteria<E>) {
    payload = clone(payload);
    const meta = getMeta(entity);
    const persistable = buildPersistable(meta, payload, 'onUpdate');
    const filter = this.dialect.filter(entity, qm.$filter);
    const update = { $set: persistable };

    log('updateMany', entity.name, filter, update);

    const { modifiedCount } = await this.collection(entity).updateMany(filter, update, {
      session: this.session,
    });

    await this.updateRelations(entity, payload, qm);

    return modifiedCount;
  }

  override async deleteMany<E>(entity: Type<E>, qm: QueryCriteria<E>) {
    const filter = this.dialect.filter(entity, qm.$filter);
    log('deleteMany', entity.name, filter);
    const res = await this.collection(entity).deleteMany(filter, {
      session: this.session,
    });
    await this.deleteRelations(entity, qm);
    return res.deletedCount;
  }

  override get hasOpenTransaction() {
    return this.session?.inTransaction();
  }

  collection<E>(entity: Type<E>) {
    const meta = getMeta(entity);
    return this.conn.db().collection(meta.name);
  }

  override async beginTransaction() {
    if (this.session?.inTransaction()) {
      throw new TypeError('pending transaction');
    }
    log('beginTransaction');
    this.session = this.conn.startSession();
    this.session.startTransaction();
  }

  override async commitTransaction() {
    if (!this.session?.inTransaction()) {
      throw new TypeError('not a pending transaction');
    }
    log('commitTransaction');
    await this.session.commitTransaction();
    this.session.endSession();
  }

  override async rollbackTransaction() {
    if (!this.session?.inTransaction()) {
      throw new TypeError('not a pending transaction');
    }
    log('rollbackTransaction');
    await this.session.abortTransaction();
  }

  override async release(force?: boolean) {
    if (this.session?.inTransaction()) {
      throw new TypeError('pending transaction');
    }
    await this.conn.close(force);
  }
}

export function normalizeIds<E>(docs: E | E[], meta: EntityMeta<E>) {
  if (Array.isArray(docs)) {
    docs.forEach((doc) => normalizeId(doc, meta));
  } else {
    normalizeId<E>(docs, meta);
  }
}

function normalizeId<E>(doc: E, meta: EntityMeta<E>) {
  if (!doc) {
    return;
  }
  const res = doc as E & { _id: any };
  res[meta.id] = res._id;
  delete res._id;
  getKeys(meta.relations).forEach((relProp) => {
    const relOpts = meta.relations[relProp];
    const relData = res[relProp];
    if (typeof relData === 'object' && !(relData instanceof ObjectId)) {
      const relMeta = getMeta(relOpts.entity());
      normalizeIds(relData, relMeta);
    }
  });
  return res as E;
}
