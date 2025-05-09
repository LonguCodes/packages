import type {Type} from "../types.ts";
import {isConstructor} from "../type-checks.ts";
import { v4 } from "uuid";
import {INJECT_METADATA_KEY} from "./decorators.ts";

const DI_TOKEN = Symbol("di-token");

export class DIStore {

    private _instances = new Map<string, any>();

    public getInstance<T>(clsOrToken: Type<T> | unknown): T | undefined{
        let token = null;
        if(isConstructor(clsOrToken)){
            if(!Reflect.hasMetadata(DI_TOKEN, clsOrToken))
                Reflect.defineMetadata(DI_TOKEN, v4(), clsOrToken);
            token = Reflect.getMetadata(DI_TOKEN, clsOrToken);
        } else {
            token = clsOrToken;
        }

        if(this._instances.has(token))
            return this._instances.get(token);

        if(isConstructor(clsOrToken)) {
            const instance = new clsOrToken() as T;
            this.injectProperties(instance, clsOrToken);
            this._instances.set(token, instance);
            return instance;
        }
    }

    private injectProperties<T>(instance: T, cls: Type<T>){
        const propertiesToInject = Reflect.getMetadata(INJECT_METADATA_KEY, cls);
        if(!propertiesToInject) return;

        for(const [key, token] of Object.entries(propertiesToInject)) {
            const value = this.getInstance(token);
            Object.defineProperty(instance, key, { value });
        }
    }
}