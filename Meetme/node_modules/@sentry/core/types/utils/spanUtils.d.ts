import type { Span, TraceContext } from '@sentry/types';
/**
 * Convert a span to a trace context, which can be sent as the `trace` context in an event.
 */
export declare function spanToTraceContext(span: Span): TraceContext;
/**
 * Convert a Span to a Sentry trace header.
 */
export declare function spanToTraceHeader(span: Span): string;
//# sourceMappingURL=spanUtils.d.ts.map