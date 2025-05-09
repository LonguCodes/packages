import { Hono } from "hono";
import {httpConfigStore} from "./http.config-store";
import {DIStore} from "../di/di-store";
import { HTTPException } from "hono/http-exception";

export function start(){
    const app = new Hono();

    const defaultStore = new DIStore();

    for (const path of httpConfigStore.paths) {
        app[path.method](path.path, async (c) => {
            const handler = defaultStore.getInstance<Record<any, Function>>(path.handler)
            if (!handler)
                throw new HTTPException(404, {message: 'Route not found'});
            const handlerMethod = handler[path.handlerMethod]
            if (!handlerMethod)
                throw new HTTPException(404, {message: 'Route not found'});
            const result = await handlerMethod(await c.req.json(), c.req.header())

            return c.json(result)
        })
    }

    app.onError((err) => {
        console.error(err);
        if(!(err instanceof HTTPException)) {
            err = new HTTPException(500, {cause: err})
        }
        return (err as HTTPException).getResponse()
    })

    return app;
}
