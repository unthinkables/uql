import { getQuerierPool, getRepository } from '@uql/core/options';
import { Querier, QuerierPool, Type } from '../../type';
import { getInjectedQuerierIndex } from './injectQuerier';
import { getInjectedRepositoriesMap } from './injectRepository';

type Props = {
  readonly propagation?: 'supported' | 'required';
  readonly querierPool?: QuerierPool;
};

export function Transactional(options: Props = {}) {
  const { propagation, querierPool } = { propagation: 'required', ...options };

  return (target: object, prop: string, propDescriptor: PropertyDescriptor): void => {
    const theClass = target.constructor as Type<any>;
    const originalMethod = propDescriptor.value;
    const injectedQuerierIndex = getInjectedQuerierIndex(theClass, prop);
    const injectedRepositoriesMap = getInjectedRepositoriesMap(theClass, prop);

    if (injectedQuerierIndex === undefined && injectedRepositoriesMap === undefined) {
      throw new TypeError(
        `missing decorator @InjectQuerier() or @InjectRepository(SomeEntity) in '${target.constructor.name}.${prop}'`
      );
    }

    propDescriptor.value = async function func(this: object, ...args: any[]) {
      const params = [...args];
      let isOwnTransaction: boolean;
      let querier: Querier;

      if (params[injectedQuerierIndex]) {
        querier = params[injectedQuerierIndex];
      } else {
        isOwnTransaction = true;
        const pool = querierPool ?? getQuerierPool();
        querier = await pool.getQuerier();
        params[injectedQuerierIndex] = querier;
      }

      injectedRepositoriesMap &&
        Object.entries(injectedRepositoriesMap).forEach(([index, entity]: [string, Type<any>]) => {
          if (params[index] === undefined) {
            params[index] = getRepository(entity, querier);
          }
        });

      try {
        if (propagation === 'required' && !querier.hasOpenTransaction) {
          await querier.beginTransaction();
        }
        const resp = await originalMethod.apply(this, params);
        if (isOwnTransaction && querier.hasOpenTransaction) {
          await querier.commitTransaction();
        }
        return resp;
      } catch (err) {
        if (isOwnTransaction && querier.hasOpenTransaction) {
          await querier.rollbackTransaction();
        }
        throw err;
      } finally {
        if (isOwnTransaction) {
          await querier.release();
        }
      }
    };
  };
}
