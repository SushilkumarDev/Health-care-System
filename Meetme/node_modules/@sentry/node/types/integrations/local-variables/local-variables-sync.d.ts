import type { IntegrationFn } from '@sentry/types';
import type { Debugger, InspectorNotification } from 'inspector';
import type { Variables } from './common';
type OnPauseEvent = InspectorNotification<Debugger.PausedEventDataType>;
export interface DebugSession {
    /** Configures and connects to the debug session */
    configureAndConnect(onPause: (message: OnPauseEvent, complete: () => void) => void, captureAll: boolean): void;
    /** Updates which kind of exceptions to capture */
    setPauseOnExceptions(captureAll: boolean): void;
    /** Gets local variables for an objectId */
    getLocalVariables(objectId: string, callback: (vars: Variables) => void): void;
}
type Next<T> = (result: T) => void;
type Add<T> = (fn: Next<T>) => void;
type CallbackWrapper<T> = {
    add: Add<T>;
    next: Next<T>;
};
/** Creates a container for callbacks to be called sequentially */
export declare function createCallbackList<T>(complete: Next<T>): CallbackWrapper<T>;
/**
 * Adds local variables to exception frames
 */
export declare const localVariablesSync: IntegrationFn;
/**
 * Adds local variables to exception frames
 */
export declare const LocalVariablesSync: import("@sentry/types").Integration & {
    new (...args: any[]): import("@sentry/types").Integration & import("@sentry/types").IntegrationFnResult & {
        setupOnce: (addGlobalEventProcessor?: ((callback: import("@sentry/types").EventProcessor) => void) | undefined, getCurrentHub?: (() => import("@sentry/types").Hub) | undefined) => void;
    };
    id: string;
};
export {};
//# sourceMappingURL=local-variables-sync.d.ts.map