import type {Type} from "./types";

export function isConstructor(maybeCls: unknown): maybeCls is Type{
    return typeof maybeCls === 'function' && !!maybeCls.prototype && !!maybeCls.prototype.constructor.name;
}
