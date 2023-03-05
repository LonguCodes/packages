import '../types';
let plainToClassMock;
jest.mock('class-transformer', () => ({
  plainToInstance: () => plainToClassMock(),
}));
const basePromise = Promise;

import '../index';
import { faker } from '@faker-js/faker';
import { BetterPromise } from './promise';

describe('Better Promise', () => {
  it('Promise.resolve should return better promise', () => {
    expect(basePromise.resolve()).toBeInstanceOf(BetterPromise);
  });

  it('Promise.reject should return better promise', () => {
    expect(basePromise.reject()).toBeInstanceOf(BetterPromise);
  });

  it('Promise.all should return better promise', () => {
    expect(basePromise.all([])).toBeInstanceOf(BetterPromise);
  });

  it('Promise.race should return better promise', () => {
    expect(basePromise.race([])).toBeInstanceOf(BetterPromise);
  });

  describe('transform', () => {
    beforeEach(() => {
      plainToClassMock = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should transform when promise is resolved', async () => {
      // Given
      const promise = Promise.resolve({ test: 1 });

      // When
      await promise.transform(undefined);

      // Then
      expect(plainToClassMock).toBeCalled();
    });

    it('should not transform when promise is rejected', async () => {
      // Given
      const promise = Promise.reject({ test: 1 });

      // When
      await promise.transform(undefined).catch(() => {});

      // Then
      expect(plainToClassMock).not.toBeCalled();
    });
  });
  describe('rethrowAs', () => {
    class Error1 extends Error {}
    class Error2 extends Error {}
    class ErrorResult extends Error {}
    class ErrorOtherResult extends Error {}

    it('should rethrow error when error type matches', async () => {
      // Given
      let promise = Promise.reject(new Error1());

      // When
      promise = promise.rethrowAs(Error1, ErrorResult);

      // Then
      await expect(promise).rejects.toThrowError(ErrorResult);
    });
    it('should rethrow error when error type matches when 2 dto are registered', async () => {
      // Given
      let promise = Promise.reject(new Error1());

      // When
      promise = promise
        .rethrowAs(Error1, ErrorResult)
        .rethrowAs(Error2, ErrorOtherResult);

      // Then
      await expect(promise).rejects.toThrowError(ErrorResult);
    });

    it('should not rethrow error when error type does not match', async () => {
      // Given
      let promise = Promise.reject(new Error2());

      // When
      promise = promise.rethrowAs(Error1, ErrorResult);

      // Then
      await expect(promise).rejects.toThrowError(Error2);
    });

    it('should not rethrow error when promise is resolved', async () => {
      // Given
      let promise = Promise.resolve(new Error1());

      // When
      promise = promise.rethrowAs(Error1, ErrorResult);

      // Then
      await expect(promise).resolves.toBeInstanceOf(Error1);
    });
  });
  describe('extract', () => {
    it('should extract value from promise result', async () => {
      // Given
      const property = faker.datatype.string();
      const value = faker.datatype.number();
      const startPromise = Promise.resolve({ [property]: value });

      // When
      const resultPromise = startPromise.extract(property);

      // Then
      await expect(resultPromise).resolves.toBe(value);
    });

    it('should return undefined when wrong property is provided', async () => {
      // Given
      const property = faker.datatype.string();
      const otherProperty = property + 'Other';
      const value = faker.datatype.number();
      const startPromise = Promise.resolve({ [property]: value });

      // When
      const resultPromise = startPromise.extract(otherProperty);

      // Then
      await expect(resultPromise).resolves.toBe(undefined);
    });
  });

  describe('wrap', () => {
    it('should wrap value from promise result', async () => {
      // Given
      const property = faker.datatype.string();
      const value = faker.datatype.number();
      const startPromise = Promise.resolve(value);

      // When
      const resultPromise = startPromise.wrap(property);

      // Then
      await expect(resultPromise).resolves.toEqual({ [property]: value });
    });
  });
});
