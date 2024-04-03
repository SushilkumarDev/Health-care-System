Object.defineProperty(exports, '__esModule', { value: true });

const utils = require('@sentry/utils');

/**
 * Convert a span to a trace context, which can be sent as the `trace` context in an event.
 */
function spanToTraceContext(span) {
  const { data, description, op, parent_span_id, span_id, status, tags, trace_id, origin } = span.toJSON();

  return utils.dropUndefinedKeys({
    data,
    description,
    op,
    parent_span_id,
    span_id,
    status,
    tags,
    trace_id,
    origin,
  });
}

/**
 * Convert a Span to a Sentry trace header.
 */
function spanToTraceHeader(span) {
  return utils.generateSentryTraceHeader(span.traceId, span.spanId, span.sampled);
}

exports.spanToTraceContext = spanToTraceContext;
exports.spanToTraceHeader = spanToTraceHeader;
//# sourceMappingURL=spanUtils.js.map
