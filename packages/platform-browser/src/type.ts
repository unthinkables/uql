import { QueryOne, QueryOneFilter, Query, QueryFilter } from '@onql/core/type';
import { IsomorphicRepository } from '@onql/core/repository';

export interface RequestSuccessResponse<T> {
  data: T;
}

export interface RequestErrorResponse {
  readonly error: {
    readonly message: string;
    readonly code: number;
  };
}

export type RequestOptions = {
  silent?: boolean;
};

type RequestBaseNotification = { readonly opts?: RequestOptions };
type RequestSuccessNotification = { readonly phase: 'start' | 'success' | 'complete' } & RequestBaseNotification;
type RequestErrorNotification = { readonly phase: 'error' } & RequestErrorResponse & RequestBaseNotification;
export type RequestNotification = RequestSuccessNotification | RequestErrorNotification;
export type RequestCallback = (msg: RequestNotification) => any;

export interface ClientRepository<T, ID = any> extends IsomorphicRepository<T, ID> {
  insertOne(body: T, opts?: RequestOptions): Promise<RequestSuccessResponse<ID>>;
  updateOneById(id: ID, body: T, opts?: RequestOptions): Promise<RequestSuccessResponse<void>>;
  saveOne(body: T, opts?: RequestOptions): Promise<RequestSuccessResponse<ID>>;
  findOneById(id: ID, qm?: QueryOne<T>, opts?: RequestOptions): Promise<RequestSuccessResponse<T>>;
  findOne(qm: QueryOneFilter<T>, opts?: any): Promise<RequestSuccessResponse<T>>;
  find(qm: Query<T>, opts?: RequestOptions): Promise<RequestSuccessResponse<T[]>>;
  removeOneById(id: ID, opts?: RequestOptions): Promise<RequestSuccessResponse<void>>;
  remove(filter: QueryFilter<T>, opts?: RequestOptions): Promise<RequestSuccessResponse<number>>;
  count(filter: QueryFilter<T>, opts?: RequestOptions): Promise<RequestSuccessResponse<number>>;
}