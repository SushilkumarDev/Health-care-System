import type { NodeClient } from '../../client';
import type { Options } from './common';
/**
 * Starts a thread to detect App Not Responding (ANR) events
 */
export declare const Anr: import("@sentry/types").Integration & {
    new (options?: Partial<Options> | undefined): import("@sentry/types").Integration & {
        name: string;
        setup(client: NodeClient): void;
    } & {
        setupOnce: (addGlobalEventProcessor?: ((callback: import("@sentry/types").EventProcessor) => void) | undefined, getCurrentHub?: (() => import("@sentry/types").Hub) | undefined) => void;
    };
    id: string;
};
//# sourceMappingURL=index.d.ts.map