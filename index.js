'use strict';

const conflogger = require('conflogger');

const DEFAULT_OPTIONS = {
  // Base amount of time in between attempts.
  delay: 0,

  // The initial delay for the first attempt
  initialDelay: 0,

  // The delay will be multiplied by this after each attempt
  // For example, if `factor` is 2 and `delay` is 1 then
  // intervals will be:
  // 1, 2, 4, 8, 64, 128, etc.
  //
  // If this value is 1 then there will be no change
  factor: 1,

  // If jitter is enabled, then the actual delay chosen will
  // be random number between 0 and the calculated delay.
  jitter: false,

  // The maximum amount of time to wait in between attempts.
  // A value of 0 will result in no capping of delay.
  maxDelay: 0,

  // The maximum number of attempts before we give up.
  // For example, if value is 3 then we will give up if the
  // 3rd attempt fails.
  maxAttempts: 3,

  // Amount of time that we will wait for operation to settle
  // before forcefully rejecting it.
  // A value of 0 means that there is no timeout.
  attemptTimeout: 0
};

let DEFAULT_KEYS = Object.keys(DEFAULT_OPTIONS);

function _applyDefaultsForMissing (options) {
  DEFAULT_KEYS.forEach((key) => {
    const value = options[key];
    if (value == null) {
      options[key] = DEFAULT_OPTIONS[key];
    }
  });
}

function tri (tryFunc, options, operationName) {
  return new Promise((resolve, reject) => {
    if (options) {
      _applyDefaultsForMissing(options);
    } else {
      options = DEFAULT_OPTIONS;
    }

    let {
      // Initial delay
      initialDelay,
      // An optional function that we will call when
      // error happens to see if we should try again.
      shouldRetry,
      handleAttemptError,
      // The max number of attempts.
      maxAttempts,
      maxRetries,
      // The max delay which is only relevant if 'factor' is provided.
      maxDelay,
      // The exponential growth factory.
      // For example, a value of 2 will cause delay to grow by
      // a power of 2 (unless jitter is introduced).
      factor,
      // Jitter is applied after a delay is calculated according
      // to other options. If 'jitter' is true then random value
      // between 0 and calculated delay will be used as the
      // actual delay.
      jitter,
      attemptTimeout
    } = options;

    const logger = conflogger.configure(options.logger);
    const logDebugEnabled = logger && logger.isDebugEnabled();

    // TODO: We can remove the check for `maxRetries` after code
    // stops using it in favor of `maxAttempts`.
    if (maxRetries) {
      maxAttempts = maxRetries + 1;
    }

    const operationNamePrefix = (operationName) ? `Operation [${operationName}]:` : 'Operation:';
    let handleError;

    let attemptNum = 0;

    const makeAttempt = () => {
      attemptNum++;

      if (logDebugEnabled) {
        logger.debug(`${operationNamePrefix} Trying attempt ${attemptNum} (maxAttempts=${maxAttempts})...`);
      }

      let onSuccess;
      let onError;

      if (attemptTimeout) {
        let timedOut = false;
        let timer = setTimeout(() => {
          timer = null;
          timedOut = true;
          let err = new Error(`${operationNamePrefix} Attempt timeout after ${attemptTimeout} milliseconds`);
          err.code = 'ATTEMPT_TIMEOUT';
          handleError(err);
        }, attemptTimeout);

        onSuccess = (result) => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }

          if (timedOut) {
            logger.warn(`${operationNamePrefix} Attempt ucceeded after timeout of ${attemptTimeout} milliseconds`);
          } else {
            resolve(result);
          }
        };

        onError = (err) => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }

          if (!timedOut) {
            handleError(err);
          }
        };
      } else {
        onSuccess = resolve;
        onError = handleError;
      }

      let promise;
      try {
        promise = tryFunc();
      } catch (err) {
        onError(err);
        return;
      }

      promise.then(onSuccess).catch(onError);
    };

    handleError = (err) => {
      logger.error(`${operationNamePrefix} Attempt ${(attemptNum)} failed (maxAttempts=${maxAttempts})`, err);

      if (handleAttemptError) {
        handleAttemptError(err);
      }

      if (shouldRetry && !shouldRetry(err)) {
        // We should not retry
        reject(err);
        return null;
      }

      if (maxAttempts && attemptNum >= maxAttempts) {
        // max number of attempts reached
        logger.error(`${operationNamePrefix} Gave up after ${(maxAttempts)} attempts`);
        reject(err);
        return null;
      }

      // Timeout calculation starts with the initial delay
      let delay = options.delay;

      if (delay) {
        if (factor) {
          delay *= Math.pow(factor, attemptNum - 1);
        }

        if (maxDelay && (delay > maxDelay)) {
          // Cap the delay
          delay = maxDelay;
        }

        if (jitter) {
          // Jitter will result in a random value between 0 and 'delay'
          // being used.
          // See https://www.awsarchitectureblog.com/2015/03/backoff.html
          // We're using the "full jitter" strategy.
          delay = Math.random() * delay;
        }

        delay = Math.round(delay);
      }

      if (logDebugEnabled) {
        logger.debug(`${operationNamePrefix} Waiting ${delay} milliseconds before trying attempt ${attemptNum + 1}`);
      }

      setTimeout(makeAttempt, delay);

      return null;
    };

    if (initialDelay) {
      // Initial delay before first attempt
      setTimeout(makeAttempt, initialDelay);
    } else {
      // Try first attempt right away
      makeAttempt();
    }
  });
}

module.exports = tri;
