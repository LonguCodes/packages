import type {Type} from "../types";

export interface HttpPath {
    path: string;
    method: 'get'|'post'|'put'|'patch'|'delete';
    handler: Type<object>,
    handlerMethod: string;
}

export const httpConfigStore: {
    paths: Set<HttpPath>
} = {
    paths: new Set<HttpPath>(),
}
