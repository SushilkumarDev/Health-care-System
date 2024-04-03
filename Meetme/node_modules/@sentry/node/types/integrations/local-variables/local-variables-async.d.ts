import type { IntegrationFn } from '@sentry/types';
/**
 * Adds local variables to exception frames
 */
export declare const localVariablesAsync: IntegrationFn;
/**
 * Adds local variables to exception frames
 */
export declare const LocalVariablesAsync: import("@sentry/types").Integration & {
    new (...args: any[]): import("@sentry/types").Integration & import("@sentry/types").IntegrationFnResult & {
        setupOnce: (addGlobalEventProcessor?: ((callback: import("@sentry/types").EventProcessor) => void) | undefined, getCurrentHub?: (() => import("@sentry/types").Hub) | undefined) => void;
    };
    id: string;
};
//# sourceMappingURL=local-variables-async.d.ts.map