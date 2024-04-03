import { convertIntegrationFnToClass, SDK_VERSION, getActiveTransaction, captureException, continueTrace, startTransaction, getCurrentScope, spanToTraceHeader } from '@sentry/core';
import { fill, dynamicSamplingContextToSentryBaggageHeader } from '@sentry/utils';

function isResponseObject(response) {
  return response && (response ).statusCode !== undefined;
}

function isBoomObject(response) {
  return response && (response ).isBoom !== undefined;
}

function isErrorEvent(event) {
  return event && (event ).error !== undefined;
}

function sendErrorToSentry(errorData) {
  captureException(errorData, {
    mechanism: {
      type: 'hapi',
      handled: false,
      data: {
        function: 'hapiErrorPlugin',
      },
    },
  });
}

const hapiErrorPlugin = {
  name: 'SentryHapiErrorPlugin',
  version: SDK_VERSION,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: async function (serverArg) {
    const server = serverArg ;

    server.events.on('request', (request, event) => {
      const transaction = getActiveTransaction();

      if (request.response && isBoomObject(request.response)) {
        sendErrorToSentry(request.response);
      } else if (isErrorEvent(event)) {
        sendErrorToSentry(event.error);
      }

      if (transaction) {
        transaction.setStatus('internal_error');
        transaction.end();
      }
    });
  },
};

const hapiTracingPlugin = {
  name: 'SentryHapiTracingPlugin',
  version: SDK_VERSION,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: async function (serverArg) {
    const server = serverArg ;

    server.ext('onPreHandler', (request, h) => {
      const transaction = continueTrace(
        {
          sentryTrace: request.headers['sentry-trace'] || undefined,
          baggage: request.headers['baggage'] || undefined,
        },
        transactionContext => {
          return startTransaction({
            ...transactionContext,
            op: 'hapi.request',
            name: request.route.path,
            description: `${request.route.method} ${request.path}`,
          });
        },
      );

      getCurrentScope().setSpan(transaction);

      return h.continue;
    });

    server.ext('onPreResponse', (request, h) => {
      const transaction = getActiveTransaction();

      if (request.response && isResponseObject(request.response) && transaction) {
        const response = request.response ;
        response.header('sentry-trace', spanToTraceHeader(transaction));

        const dynamicSamplingContext = dynamicSamplingContextToSentryBaggageHeader(
          transaction.getDynamicSamplingContext(),
        );

        if (dynamicSamplingContext) {
          response.header('baggage', dynamicSamplingContext);
        }
      }

      return h.continue;
    });

    server.ext('onPostHandler', (request, h) => {
      const transaction = getActiveTransaction();

      if (request.response && isResponseObject(request.response) && transaction) {
        transaction.setHttpStatus(request.response.statusCode);
      }

      if (transaction) {
        transaction.end();
      }

      return h.continue;
    });
  },
};

const INTEGRATION_NAME = 'Hapi';

const hapiIntegration = ((options = {}) => {
  const server = options.server ;

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      if (!server) {
        return;
      }

      fill(server, 'start', (originalStart) => {
        return async function () {
          await this.register(hapiTracingPlugin);
          await this.register(hapiErrorPlugin);
          const result = originalStart.apply(this);
          return result;
        };
      });
    },
  };
}) ;

/**
 * Hapi Framework Integration
 */
// eslint-disable-next-line deprecation/deprecation
const Hapi = convertIntegrationFnToClass(INTEGRATION_NAME, hapiIntegration);

export { Hapi, hapiErrorPlugin, hapiTracingPlugin };
//# sourceMappingURL=index.js.map
