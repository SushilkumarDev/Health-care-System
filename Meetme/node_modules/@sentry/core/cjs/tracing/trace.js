Object.defineProperty(exports, '__esModule', { value: true });

const utils = require('@sentry/utils');
const debugBuild = require('../debug-build.js');
const exports$1 = require('../exports.js');
const hub = require('../hub.js');
const handleCallbackErrors = require('../utils/handleCallbackErrors.js');
const hasTracingEnabled = require('../utils/hasTracingEnabled.js');

/**
 * Wraps a function with a transaction/span and finishes the span after the function is done.
 *
 * Note that if you have not enabled tracing extensions via `addTracingExtensions`
 * or you didn't set `tracesSampleRate`, this function will not generate spans
 * and the `span` returned from the callback will be undefined.
 *
 * This function is meant to be used internally and may break at any time. Use at your own risk.
 *
 * @internal
 * @private
 *
 * @deprecated Use `startSpan` instead.
 */
function trace(
  context,
  callback,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onError = () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  afterFinish = () => {},
) {
  const ctx = normalizeContext(context);

  const hub$1 = hub.getCurrentHub();
  const scope = exports$1.getCurrentScope();
  const parentSpan = scope.getSpan();

  const activeSpan = createChildSpanOrTransaction(hub$1, parentSpan, ctx);

  scope.setSpan(activeSpan);

  return handleCallbackErrors.handleCallbackErrors(
    () => callback(activeSpan),
    error => {
      activeSpan && activeSpan.setStatus('internal_error');
      onError(error, activeSpan);
    },
    () => {
      activeSpan && activeSpan.end();
      scope.setSpan(parentSpan);
      afterFinish();
    },
  );
}

/**
 * Wraps a function with a transaction/span and finishes the span after the function is done.
 * The created span is the active span and will be used as parent by other spans created inside the function
 * and can be accessed via `Sentry.getSpan()`, as long as the function is executed while the scope is active.
 *
 * If you want to create a span that is not set as active, use {@link startInactiveSpan}.
 *
 * Note that if you have not enabled tracing extensions via `addTracingExtensions`
 * or you didn't set `tracesSampleRate`, this function will not generate spans
 * and the `span` returned from the callback will be undefined.
 */
function startSpan(context, callback) {
  const ctx = normalizeContext(context);

  return exports$1.withScope(scope => {
    const hub$1 = hub.getCurrentHub();
    const parentSpan = scope.getSpan();

    const activeSpan = createChildSpanOrTransaction(hub$1, parentSpan, ctx);
    scope.setSpan(activeSpan);

    return handleCallbackErrors.handleCallbackErrors(
      () => callback(activeSpan),
      () => {
        // Only update the span status if it hasn't been changed yet
        if (activeSpan && (!activeSpan.status || activeSpan.status === 'ok')) {
          activeSpan.setStatus('internal_error');
        }
      },
      () => activeSpan && activeSpan.end(),
    );
  });
}

/**
 * @deprecated Use {@link startSpan} instead.
 */
const startActiveSpan = startSpan;

/**
 * Similar to `Sentry.startSpan`. Wraps a function with a transaction/span, but does not finish the span
 * after the function is done automatically. You'll have to call `span.end()` manually.
 *
 * The created span is the active span and will be used as parent by other spans created inside the function
 * and can be accessed via `Sentry.getActiveSpan()`, as long as the function is executed while the scope is active.
 *
 * Note that if you have not enabled tracing extensions via `addTracingExtensions`
 * or you didn't set `tracesSampleRate`, this function will not generate spans
 * and the `span` returned from the callback will be undefined.
 */
function startSpanManual(
  context,
  callback,
) {
  const ctx = normalizeContext(context);

  return exports$1.withScope(scope => {
    const hub$1 = hub.getCurrentHub();
    const parentSpan = scope.getSpan();

    const activeSpan = createChildSpanOrTransaction(hub$1, parentSpan, ctx);
    scope.setSpan(activeSpan);

    function finishAndSetSpan() {
      activeSpan && activeSpan.end();
    }

    return handleCallbackErrors.handleCallbackErrors(
      () => callback(activeSpan, finishAndSetSpan),
      () => {
        // Only update the span status if it hasn't been changed yet, and the span is not yet finished
        if (activeSpan && !activeSpan.endTimestamp && (!activeSpan.status || activeSpan.status === 'ok')) {
          activeSpan.setStatus('internal_error');
        }
      },
    );
  });
}

/**
 * Creates a span. This span is not set as active, so will not get automatic instrumentation spans
 * as children or be able to be accessed via `Sentry.getSpan()`.
 *
 * If you want to create a span that is set as active, use {@link startSpan}.
 *
 * Note that if you have not enabled tracing extensions via `addTracingExtensions`
 * or you didn't set `tracesSampleRate` or `tracesSampler`, this function will not generate spans
 * and the `span` returned from the callback will be undefined.
 */
function startInactiveSpan(context) {
  if (!hasTracingEnabled.hasTracingEnabled()) {
    return undefined;
  }

  const ctx = { ...context };
  // If a name is set and a description is not, set the description to the name.
  if (ctx.name !== undefined && ctx.description === undefined) {
    ctx.description = ctx.name;
  }

  const hub$1 = hub.getCurrentHub();
  const parentSpan = getActiveSpan();
  return parentSpan ? parentSpan.startChild(ctx) : hub$1.startTransaction(ctx);
}

/**
 * Returns the currently active span.
 */
function getActiveSpan() {
  return exports$1.getCurrentScope().getSpan();
}

/**
 * Continue a trace from `sentry-trace` and `baggage` values.
 * These values can be obtained from incoming request headers,
 * or in the browser from `<meta name="sentry-trace">` and `<meta name="baggage">` HTML tags.
 *
 * The callback receives a transactionContext that may be used for `startTransaction` or `startSpan`.
 */
function continueTrace(
  {
    sentryTrace,
    baggage,
  }

,
  callback,
) {
  const currentScope = exports$1.getCurrentScope();

  const { traceparentData, dynamicSamplingContext, propagationContext } = utils.tracingContextFromHeaders(
    sentryTrace,
    baggage,
  );

  currentScope.setPropagationContext(propagationContext);

  if (debugBuild.DEBUG_BUILD && traceparentData) {
    utils.logger.log(`[Tracing] Continuing trace ${traceparentData.traceId}.`);
  }

  const transactionContext = {
    ...traceparentData,
    metadata: utils.dropUndefinedKeys({
      dynamicSamplingContext: traceparentData && !dynamicSamplingContext ? {} : dynamicSamplingContext,
    }),
  };

  if (!callback) {
    return transactionContext;
  }

  return callback(transactionContext);
}

function createChildSpanOrTransaction(
  hub,
  parentSpan,
  ctx,
) {
  if (!hasTracingEnabled.hasTracingEnabled()) {
    return undefined;
  }
  return parentSpan ? parentSpan.startChild(ctx) : hub.startTransaction(ctx);
}

function normalizeContext(context) {
  const ctx = { ...context };
  // If a name is set and a description is not, set the description to the name.
  if (ctx.name !== undefined && ctx.description === undefined) {
    ctx.description = ctx.name;
  }

  return ctx;
}

exports.continueTrace = continueTrace;
exports.getActiveSpan = getActiveSpan;
exports.startActiveSpan = startActiveSpan;
exports.startInactiveSpan = startInactiveSpan;
exports.startSpan = startSpan;
exports.startSpanManual = startSpanManual;
exports.trace = trace;
//# sourceMappingURL=trace.js.map
