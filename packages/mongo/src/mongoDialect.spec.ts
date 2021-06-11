import { ObjectId } from 'mongodb';
import { Item, Spec, TaxCategory, User, createSpec } from '@uql/core/test';
import { MongoDialect } from './mongoDialect';

class MongoDialectSpec implements Spec {
  dialect: MongoDialect;

  beforeEach() {
    this.dialect = new MongoDialect();
  }

  shouldBuildFilter() {
    const output = this.dialect.where(Item, {});

    expect(output).toEqual({});

    expect(this.dialect.where(Item, { code: '123' })).toEqual({ code: '123' });

    expect(this.dialect.where(Item, { $and: [{ code: '123', name: 'abc' }] })).toEqual({
      $and: [{ code: '123', name: 'abc' }],
    });

    expect(
      this.dialect.where(TaxCategory, {
        creatorId: 1,
        $or: [{ name: { $in: ['a', 'b', 'c'] } }, { name: 'abc' }],
        pk: '507f191e810c19729de860ea',
      })
    ).toEqual({
      creatorId: 1,
      $or: [{ name: { $in: ['a', 'b', 'c'] } }, { name: 'abc' }],
      _id: new ObjectId('507f191e810c19729de860ea'),
    });

    expect(this.dialect.where(Item, { id: '507f191e810c19729de860ea' as any })).toEqual({
      _id: new ObjectId('507f191e810c19729de860ea'),
    });

    expect(this.dialect.where(Item, { id: new ObjectId('507f191e810c19729de860ea') as any })).toEqual({
      _id: new ObjectId('507f191e810c19729de860ea'),
    });

    expect(this.dialect.where(TaxCategory, { pk: '507f191e810c19729de860ea' })).toEqual({
      _id: new ObjectId('507f191e810c19729de860ea'),
    });

    expect(this.dialect.where(TaxCategory, { pk: new ObjectId('507f191e810c19729de860ea') as any })).toEqual({
      _id: new ObjectId('507f191e810c19729de860ea'),
    });
  }

  shouldBuildAggregationPipeline() {
    expect(this.dialect.aggregationPipeline(Item, {})).toEqual([]);

    expect(this.dialect.aggregationPipeline(Item, { $filter: {} })).toEqual([]);

    expect(this.dialect.aggregationPipeline(Item, { $populate: {} })).toEqual([]);

    expect(() =>
      this.dialect.aggregationPipeline(User, {
        $populate: { creatorId: {} } as any,
      })
    ).toThrow("'User.creatorId' is not annotated as a relation");

    expect(
      this.dialect.aggregationPipeline(Item, {
        $filter: { code: '123' },
        $populate: { measureUnit: {}, tax: {} },
      })
    ).toEqual([
      {
        $match: {
          code: '123',
        },
      },
      {
        $lookup: {
          as: 'measureUnit',
          foreignField: '_id',
          from: 'MeasureUnit',
          localField: 'measureUnitId',
        },
      },
      {
        $unwind: { path: '$measureUnit', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          as: 'tax',
          foreignField: '_id',
          from: 'Tax',
          localField: 'taxId',
        },
      },
      {
        $unwind: { path: '$tax', preserveNullAndEmptyArrays: true },
      },
    ]);
  }
}

createSpec(new MongoDialectSpec());
