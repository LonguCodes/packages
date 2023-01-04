export function rewriteClass<TSource, TDest>(
  source: TSource,
  dest: TDest
): TSource {
  for (const propertyName of Object.getOwnPropertyNames(source)) {
    if (!(propertyName in dest)) dest[propertyName] = source[propertyName];
  }
  return dest as unknown as TSource;
}
