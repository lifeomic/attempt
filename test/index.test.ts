import test from 'ava';
import { retry, sleep } from '../src';

function almostEqual (a: number, b: number, tolerance: number) {
  return Math.abs(a - b) <= tolerance;
}

const DELAY_TOLERANCE = parseInt(process.env.DELAY_TOLERANCE, 10) || 50;

test('should default to 3 attempts with 200 delay', async (t) => {
  let expectedDelays = [
    0,
    200,
    200
  ];

  let lastTime = Date.now();
  let attemptCount = 0;

  const err = await t.throws(retry(async (context, options) => {
    t.deepEqual(options, {
      delay: 200,
      initialDelay: 0,
      minDelay: 0,
      maxDelay: 0,
      factor: 0,
      maxAttempts: 3,
      timeout: 0,
      jitter: false,
      handleError: null,
      handleTimeout: null,
      beforeAttempt: null,
      calculateDelay: null
    });

    attemptCount++;

    let newTime = Date.now();
    let diff = newTime - lastTime;
    lastTime = newTime;

    t.true(diff <= (expectedDelays[context.attemptNum] + DELAY_TOLERANCE));

    throw new Error(`attempt ${context.attemptNum}`);
  }));

  t.is(attemptCount, 3);
  t.is(err.message, 'attempt 2');
});

test('should support initialDelay', async (t) => {
  let expectedDelays = [
    100,
    300,
    300
  ];

  let lastTime = Date.now();
  let attemptCount = 0;

  const err = await t.throws(retry(async (context) => {
    attemptCount++;

    let newTime = Date.now();
    let diff = newTime - lastTime;
    lastTime = newTime;

    t.true(diff <= (expectedDelays[context.attemptNum] + DELAY_TOLERANCE));

    throw new Error(`attempt ${context.attemptNum}`);
  }, {
    initialDelay: 100,
    maxAttempts: 3,
    delay: 300
  }));

  t.is(attemptCount, 3);
  t.is(err.message, 'attempt 2');
});

test('should stop trying once maxAttempts is reached', async (t) => {
  const maxAttempts = 5;
  let attemptCount = 0;

  const err = await t.throws(retry(async (context) => {
    t.is(context.attemptNum, attemptCount);
    attemptCount++;
    throw new Error('FAILED');
  }, {
    maxAttempts,
    delay: 0
  }));

  t.is(err.message, 'FAILED');
  t.is(attemptCount, maxAttempts);
});

test('should support timeout on first attempt', async (t) => {
  const err = await t.throws(retry(async () => {
    await sleep(500);
  }, {
    delay: 0,
    timeout: 50,
    maxAttempts: 3
  }));

  t.is(err.code, 'ATTEMPT_TIMEOUT');
});

test('should support timeout and handleTimeout', async (t) => {
  async function fallback () {
    await sleep(100);
    return 'used fallback';
  }

  const result = await retry(async () => {
    await sleep(500);
  }, {
    delay: 0,
    timeout: 50,
    maxAttempts: 2,
    handleTimeout: fallback
  });

  t.is(result, 'used fallback');
});

test('should allow handleTimeout to throw an error', async (t) => {
  const err = await t.throws(retry(async () => {
    await sleep(500);
  }, {
    delay: 0,
    timeout: 50,
    maxAttempts: 2,
    handleTimeout: async (context) => {
      throw new Error('timeout occurred');
    }
  }));

  t.is(err.message, 'timeout occurred');
});

test('should support timeout for multiple attempts', async (t) => {
  let attemptCount = 0;
  const err = await t.throws(retry(async (context) => {
    attemptCount++;

    if (context.attemptNum === 2) {
      return sleep(500);
    } else {
      throw new Error('fake error');
    }
  }, {
    delay: 0,
    timeout: 50,
    maxAttempts: 5
  }));

  // third attempt should timeout
  t.is(attemptCount, 3);
  t.is(err.code, 'ATTEMPT_TIMEOUT');
});

test('should support retries', async (t) => {
  const resultMessage = 'hello';
  const result = await retry(async (context) => {
    if (context.attemptsRemaining === 0) {
      return resultMessage;
    } else {
      throw new Error('not done');
    }
  }, {
    delay: 0,
    maxAttempts: 5
  });

  t.is(result, resultMessage);
});

test('should not exceed maximum retries', async (t) => {
  const err = await t.throws(retry(async (context) => {
    if (context.attemptNum !== 5) {
      throw new Error('FAILED');
    }
  }, {
    delay: 0,
    maxAttempts: 4
  }));
  t.is(err.message, 'FAILED');
});

test('should support factor property', async (t) => {
  let expectedDelays = [
    0,
    100,
    200,
    400,
    800
  ];

  let lastTime = Date.now();

  return retry(async (context) => {
    let newTime = Date.now();
    let diff = newTime - lastTime;
    lastTime = newTime;

    t.true(almostEqual(diff, expectedDelays[context.attemptNum], DELAY_TOLERANCE));

    if (context.attemptsRemaining > 0) {
      throw new Error('FAILED');
    }
  }, {
    maxAttempts: expectedDelays.length,
    delay: 100,
    factor: 2
  });
});

test('should support maximum delay', async (t) => {
  let expectedDelays = [
    0,
    100,
    200,
    400,
    800
  ];

  let lastTime = Date.now();

  return retry(async (context) => {
    let newTime = Date.now();
    let diff = newTime - lastTime;
    lastTime = newTime;

    t.true(almostEqual(diff, Math.min(expectedDelays[context.attemptNum], 200), DELAY_TOLERANCE));

    if (context.attemptNum !== 4) {
      throw new Error('FAILED');
    }
  }, {
    maxAttempts: 0,
    delay: 100,
    maxDelay: 200,
    factor: 2
  });
});

test('should support jitter', async (t) => {
  let expectedDelays = [
    0,
    100,
    200,
    400,
    800
  ];

  let lastTime = Date.now();

  return retry(async (context) => {
    let newTime = Date.now();
    let diff = newTime - lastTime;
    lastTime = newTime;

    t.true(diff <= (expectedDelays[context.attemptNum] + DELAY_TOLERANCE));

    if (context.attemptsRemaining === 0) {
      return 'success';
    } else {
      throw new Error('try again');
    }
  }, {
    maxAttempts: expectedDelays.length,
    delay: 100,
    factor: 2,
    jitter: true
  });
});

test('should support jitter with minDelay', async (t) => {
  let expectedDelays = [
    0,
    100,
    200,
    400,
    800
  ];

  let lastTime = Date.now();
  const minDelay = 100;

  return retry(async (context) => {
    let newTime = Date.now();
    let diff = newTime - lastTime;
    lastTime = newTime;

    if (context.attemptNum > 0) {
      t.true(diff >= minDelay);
    }

    t.true(diff <= (expectedDelays[context.attemptNum] + DELAY_TOLERANCE));

    if (context.attemptsRemaining === 0) {
      return 'success';
    } else {
      throw new Error('try again');
    }
  }, {
    maxAttempts: expectedDelays.length,
    delay: 100,
    minDelay,
    factor: 2,
    jitter: true
  });
});

test('should detect invalid minDelay', async (t) => {
  const err = await t.throws(retry(async (context) => {
    throw new Error('should not get here');
  }, {
    delay: 100,
    minDelay: 200
  }));

  t.true(err.message.startsWith('delay cannot be less than minDelay'));
});

test('should detect invalid integer option', async (t) => {
  for (const prop of [
    'delay',
    'initialDelay',
    'minDelay',
    'maxDelay',
    'factor',
    'maxAttempts',
    'timeout'
  ]) {
    try {
      await retry(async (context) => {
        throw new Error('should not get here');
      }, {
        [prop]: -1
      });
    } catch (err) {
      t.is(err.message, `Value for ${prop} must be an integer greater than or equal to 0`);
    }

    try {
      await retry(async (context) => {
        throw new Error('should not get here');
      }, {
        [prop]: 'abc'
      });
    } catch (err) {
      t.is(err.message, `Value for ${prop} must be an integer greater than or equal to 0`);
    }
  }
});

test('should allow attempts to be aborted via handleError', async (t) => {
  const err = await t.throws(retry(async (context) => {
    if (context.attemptNum === 1) {
      const err: any = new Error('Fatal error');
      err.retryable = false;
      throw err;
    } else {
      throw new Error('try again');
    }
  }, {
    delay: 0,
    maxAttempts: 4,
    handleError (err, context) {
      if (err.retryable === false) {
        context.abort();
      }
    }
  }));
  t.is(err.retryable, false);
});

test('should allow handleError to return new error', async (t) => {
  const err = await t.throws(retry(async (context) => {
    if (context.attemptNum === 1) {
      const err: any = new Error('Fatal error');
      err.retryable = false;
      throw err;
    } else {
      throw new Error('try again');
    }
  }, {
    delay: 0,
    maxAttempts: 4,
    handleError (err, context) {
      if (err.retryable === false) {
        throw new Error('not retryable');
      }
    }
  }));
  t.is(err.message, 'not retryable');
});

test('should allow attempts to be aborted via beforeAttempt', async (t) => {
  const err = await t.throws(retry(async (context) => {
    throw new Error('try again');
  }, {
    delay: 0,
    maxAttempts: 4,
    beforeAttempt (context) {
      if (context.attemptsRemaining === 3) {
        context.abort();
      }
    }
  }));
  t.is(err.code, 'ATTEMPT_ABORTED');
});

test('should allow caller to provide calculateDelay function', async (t) => {
  let expectedDelays = [
    50,
    150,
    250,
    350,
    450
  ];

  let lastTime = Date.now();

  return retry(async (context) => {
    let newTime = Date.now();
    let diff = newTime - lastTime;
    lastTime = newTime;

    t.true(diff <= (expectedDelays[context.attemptNum] + DELAY_TOLERANCE));

    if (context.attemptsRemaining === 0) {
      return 'success';
    }
  }, {
    maxAttempts: expectedDelays.length,
    delay: 0,
    factor: 2,
    calculateDelay (context) {
      return context.attemptNum * 100 + 50;
    }
  });
});
