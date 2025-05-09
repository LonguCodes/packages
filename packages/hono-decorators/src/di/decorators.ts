
export const INJECT_METADATA_KEY = Symbol('inject-metadata')
export function Inject(typeOrToken?: unknown){
    return (target: any, property: string|symbol) => {
        typeOrToken ??= Reflect.getMetadata('design:type',target,property );
        if(!typeOrToken || typeOrToken === Object)
            return;
        const currentMetadata = Reflect.getMetadata(INJECT_METADATA_KEY, target.constructor) ??{};
        currentMetadata[property] = typeOrToken;
        Reflect.defineMetadata(INJECT_METADATA_KEY, currentMetadata, target.constructor);
    }
}