/** Console module integration */
export declare const Console: import("@sentry/types").Integration & {
    new (): import("@sentry/types").Integration & {
        name: string;
        setup(client: import("@sentry/types").Client<import("@sentry/types").ClientOptions<import("@sentry/types").BaseTransportOptions>>): void;
    } & {
        setupOnce: (addGlobalEventProcessor?: ((callback: import("@sentry/types").EventProcessor) => void) | undefined, getCurrentHub?: (() => import("@sentry/types").Hub) | undefined) => void;
    };
    id: string;
};
//# sourceMappingURL=console.d.ts.map