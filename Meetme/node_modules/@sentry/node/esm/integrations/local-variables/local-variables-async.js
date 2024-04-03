import { _optionalChain } from '@sentry/utils';
import { convertIntegrationFnToClass } from '@sentry/core';
import { LRUMap, dynamicRequire, logger } from '@sentry/utils';
import { createRateLimiter, hashFromStack, hashFrames, functionNamesMatch } from './common.js';

async function unrollArray(session, objectId, name, vars) {
  const properties = await session.post('Runtime.getProperties', {
    objectId,
    ownProperties: true,
  });

  vars[name] = properties.result
    .filter(v => v.name !== 'length' && !isNaN(parseInt(v.name, 10)))
    .sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10))
    .map(v => _optionalChain([v, 'access', _2 => _2.value, 'optionalAccess', _3 => _3.value]));
}

async function unrollObject(session, objectId, name, vars) {
  const properties = await session.post('Runtime.getProperties', {
    objectId,
    ownProperties: true,
  });

  vars[name] = properties.result
    .map(v => [v.name, _optionalChain([v, 'access', _4 => _4.value, 'optionalAccess', _5 => _5.value])])
    .reduce((obj, [key, val]) => {
      obj[key] = val;
      return obj;
    }, {} );
}

function unrollOther(prop, vars) {
  if (_optionalChain([prop, 'optionalAccess', _6 => _6.value, 'optionalAccess', _7 => _7.value])) {
    vars[prop.name] = prop.value.value;
  } else if (_optionalChain([prop, 'optionalAccess', _8 => _8.value, 'optionalAccess', _9 => _9.description]) && _optionalChain([prop, 'optionalAccess', _10 => _10.value, 'optionalAccess', _11 => _11.type]) !== 'function') {
    vars[prop.name] = `<${prop.value.description}>`;
  }
}

async function getLocalVariables(session, objectId) {
  const properties = await session.post('Runtime.getProperties', {
    objectId,
    ownProperties: true,
  });
  const variables = {};

  for (const prop of properties.result) {
    if (_optionalChain([prop, 'optionalAccess', _12 => _12.value, 'optionalAccess', _13 => _13.objectId]) && _optionalChain([prop, 'optionalAccess', _14 => _14.value, 'access', _15 => _15.className]) === 'Array') {
      const id = prop.value.objectId;
      await unrollArray(session, id, prop.name, variables);
    } else if (_optionalChain([prop, 'optionalAccess', _16 => _16.value, 'optionalAccess', _17 => _17.objectId]) && _optionalChain([prop, 'optionalAccess', _18 => _18.value, 'optionalAccess', _19 => _19.className]) === 'Object') {
      const id = prop.value.objectId;
      await unrollObject(session, id, prop.name, variables);
    } else if (_optionalChain([prop, 'optionalAccess', _20 => _20.value, 'optionalAccess', _21 => _21.value]) || _optionalChain([prop, 'optionalAccess', _22 => _22.value, 'optionalAccess', _23 => _23.description])) {
      unrollOther(prop, variables);
    }
  }

  return variables;
}

const INTEGRATION_NAME = 'LocalVariablesAsync';

/**
 * Adds local variables to exception frames
 */
const localVariablesAsync = (options = {}) => {
  const cachedFrames = new LRUMap(20);
  let rateLimiter;
  let shouldProcessEvent = false;

  async function handlePaused(
    session,
    stackParser,
    { reason, data, callFrames },
  ) {
    if (reason !== 'exception' && reason !== 'promiseRejection') {
      return;
    }

    _optionalChain([rateLimiter, 'optionalCall', _24 => _24()]);

    // data.description contains the original error.stack
    const exceptionHash = hashFromStack(stackParser, _optionalChain([data, 'optionalAccess', _25 => _25.description]));

    if (exceptionHash == undefined) {
      return;
    }

    const frames = [];

    for (let i = 0; i < callFrames.length; i++) {
      const { scopeChain, functionName, this: obj } = callFrames[i];

      const localScope = scopeChain.find(scope => scope.type === 'local');

      // obj.className is undefined in ESM modules
      const fn = obj.className === 'global' || !obj.className ? functionName : `${obj.className}.${functionName}`;

      if (_optionalChain([localScope, 'optionalAccess', _26 => _26.object, 'access', _27 => _27.objectId]) === undefined) {
        frames[i] = { function: fn };
      } else {
        const vars = await getLocalVariables(session, localScope.object.objectId);
        frames[i] = { function: fn, vars };
      }
    }

    cachedFrames.set(exceptionHash, frames);
  }

  async function startDebugger(session, clientOptions) {
    session.connect();

    let isPaused = false;

    session.on('Debugger.resumed', () => {
      isPaused = false;
    });

    session.on('Debugger.paused', (event) => {
      isPaused = true;

      handlePaused(session, clientOptions.stackParser, event.params ).then(
        () => {
          // After the pause work is complete, resume execution!
          return isPaused ? session.post('Debugger.resume') : Promise.resolve();
        },
        _ => {
          // ignore
        },
      );
    });

    await session.post('Debugger.enable');

    const captureAll = options.captureAllExceptions !== false;
    await session.post('Debugger.setPauseOnExceptions', { state: captureAll ? 'all' : 'uncaught' });

    if (captureAll) {
      const max = options.maxExceptionsPerSecond || 50;

      rateLimiter = createRateLimiter(
        max,
        () => {
          logger.log('Local variables rate-limit lifted.');
          return session.post('Debugger.setPauseOnExceptions', { state: 'all' });
        },
        seconds => {
          logger.log(
            `Local variables rate-limit exceeded. Disabling capturing of caught exceptions for ${seconds} seconds.`,
          );
          return session.post('Debugger.setPauseOnExceptions', { state: 'uncaught' });
        },
      );
    }

    shouldProcessEvent = true;
  }

  function addLocalVariablesToException(exception) {
    const hash = hashFrames(_optionalChain([exception, 'access', _28 => _28.stacktrace, 'optionalAccess', _29 => _29.frames]));

    if (hash === undefined) {
      return;
    }

    // Check if we have local variables for an exception that matches the hash
    // remove is identical to get but also removes the entry from the cache
    const cachedFrame = cachedFrames.remove(hash);

    if (cachedFrame === undefined) {
      return;
    }

    const frameCount = _optionalChain([exception, 'access', _30 => _30.stacktrace, 'optionalAccess', _31 => _31.frames, 'optionalAccess', _32 => _32.length]) || 0;

    for (let i = 0; i < frameCount; i++) {
      // Sentry frames are in reverse order
      const frameIndex = frameCount - i - 1;

      // Drop out if we run out of frames to match up
      if (!_optionalChain([exception, 'access', _33 => _33.stacktrace, 'optionalAccess', _34 => _34.frames, 'optionalAccess', _35 => _35[frameIndex]]) || !cachedFrame[i]) {
        break;
      }

      if (
        // We need to have vars to add
        cachedFrame[i].vars === undefined ||
        // We're not interested in frames that are not in_app because the vars are not relevant
        exception.stacktrace.frames[frameIndex].in_app === false ||
        // The function names need to match
        !functionNamesMatch(exception.stacktrace.frames[frameIndex].function, cachedFrame[i].function)
      ) {
        continue;
      }

      exception.stacktrace.frames[frameIndex].vars = cachedFrame[i].vars;
    }
  }

  function addLocalVariablesToEvent(event) {
    for (const exception of _optionalChain([event, 'access', _36 => _36.exception, 'optionalAccess', _37 => _37.values]) || []) {
      addLocalVariablesToException(exception);
    }

    return event;
  }

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      const clientOptions = client.getOptions();

      if (!clientOptions.includeLocalVariables) {
        return;
      }

      try {
        // TODO: Use import()...
        // It would be nice to use import() here, but this built-in library is not in Node <19 so webpack will pick it
        // up and report it as a missing dependency
        const { Session } = dynamicRequire(module, 'node:inspector/promises');

        startDebugger(new Session(), clientOptions).catch(e => {
          logger.error('Failed to start inspector session', e);
        });
      } catch (e) {
        logger.error('Failed to load inspector API', e);
        return;
      }
    },
    processEvent(event) {
      if (shouldProcessEvent) {
        return addLocalVariablesToEvent(event);
      }

      return event;
    },
  };
};

/**
 * Adds local variables to exception frames
 */
// eslint-disable-next-line deprecation/deprecation
convertIntegrationFnToClass(INTEGRATION_NAME, localVariablesAsync);

export { localVariablesAsync };
//# sourceMappingURL=local-variables-async.js.map
