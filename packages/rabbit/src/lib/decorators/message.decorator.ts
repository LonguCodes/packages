export const MESSAGE_KEY = Symbol('message');


function DecorateParameter<TValue>(key: string | symbol, value: TValue) {
  return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
    const metadata = Reflect.getMetadata(key, target, propertyKey) ?? {};
    metadata[parameterIndex] = value;
    Reflect.defineMetadata(key, metadata, target, propertyKey);
  };
}

export function MessageHeaders() {
  return DecorateParameter(MESSAGE_KEY, 'headers');
}

export function MessageRaw() {
  return DecorateParameter(MESSAGE_KEY, 'contentRaw');

}

export function Message() {
  return DecorateParameter(MESSAGE_KEY, 'content');

}
