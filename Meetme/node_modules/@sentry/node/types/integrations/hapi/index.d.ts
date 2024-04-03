export declare const hapiErrorPlugin: {
    name: string;
    version: string;
    register: (serverArg: Record<any, any>) => Promise<void>;
};
export declare const hapiTracingPlugin: {
    name: string;
    version: string;
    register: (serverArg: Record<any, any>) => Promise<void>;
};
export type HapiOptions = {
    /** Hapi server instance */
    server?: Record<any, any>;
};
/**
 * Hapi Framework Integration
 */
export declare const Hapi: import("@sentry/types").Integration & {
    new (options?: HapiOptions | undefined): import("@sentry/types").Integration & {
        name: string;
        setupOnce(): void;
    } & {
        setupOnce: (addGlobalEventProcessor?: ((callback: import("@sentry/types").EventProcessor) => void) | undefined, getCurrentHub?: (() => import("@sentry/types").Hub) | undefined) => void;
    };
    id: string;
};
//# sourceMappingURL=index.d.ts.map