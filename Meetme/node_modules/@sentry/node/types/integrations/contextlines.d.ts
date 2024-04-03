import type { Event } from '@sentry/types';
/**
 * Resets the file cache. Exists for testing purposes.
 * @hidden
 */
export declare function resetFileContentCache(): void;
interface ContextLinesOptions {
    /**
     * Sets the number of context lines for each frame when loading a file.
     * Defaults to 7.
     *
     * Set to 0 to disable loading and inclusion of source files.
     **/
    frameContextLines?: number;
}
/** Add node modules / packages to the event */
export declare const ContextLines: import("@sentry/types").Integration & {
    new (options?: ContextLinesOptions | undefined): import("@sentry/types").Integration & {
        name: string;
        processEvent(event: Event): Promise<Event>;
    } & {
        setupOnce: (addGlobalEventProcessor?: ((callback: import("@sentry/types").EventProcessor) => void) | undefined, getCurrentHub?: (() => import("@sentry/types").Hub) | undefined) => void;
    };
    id: string;
};
export {};
//# sourceMappingURL=contextlines.d.ts.map