import { Vars } from "./types";

// Special object that returns new Symbols when accessed
export const $vars = new Proxy({} as Vars, {
    get(_, prop) {
        if (typeof prop === "string") {
            // Return a symbol constructed with the property name
            return Symbol(prop);
        }
        return undefined;
    },
}) as Vars;

// Note: avoid import.meta.main in Next.js/Node
