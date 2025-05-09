import {httpConfigStore, type HttpPath} from "./http.config-store.ts";
import type {Type} from "../types.ts";

export function Route(method: HttpPath['method'], path: string){
    return (target: object, property: string, descriptor: TypedPropertyDescriptor<any>) => {
        httpConfigStore.paths.add( {
            path,
            method,
            handler: target.constructor as Type<object>,
            handlerMethod: property
        });
    }
}

export function Get(path: string){
    return Route('get', path);
}
export function Post(path: string){
    return Route('post', path);
}
export function Patch(path: string){
    return Route('patch', path);
}
export function Put(path: string){
    return Route('put', path);
}