import '../types';
let plainToClassMock;
jest.mock('class-transformer', () => ({
  plainToInstance: () => plainToClassMock(),
}));
import '../index';

describe('Better Promise', () => {
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
      await promise.transform(undefined).catch(function () {});

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
});
