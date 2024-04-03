import * as util from 'util';
import { convertIntegrationFnToClass, getClient, addBreadcrumb } from '@sentry/core';
import { addConsoleInstrumentationHandler, severityLevelFromString } from '@sentry/utils';

const INTEGRATION_NAME = 'Console';

const consoleIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      addConsoleInstrumentationHandler(({ args, level }) => {
        if (getClient() !== client) {
          return;
        }

        addBreadcrumb(
          {
            category: 'console',
            level: severityLevelFromString(level),
            message: util.format.apply(undefined, args),
          },
          {
            input: [...args],
            level,
          },
        );
      });
    },
  };
}) ;

/** Console module integration */
// eslint-disable-next-line deprecation/deprecation
const Console = convertIntegrationFnToClass(INTEGRATION_NAME, consoleIntegration);

export { Console };
//# sourceMappingURL=console.js.map
