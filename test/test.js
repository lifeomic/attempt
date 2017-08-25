'use strict'

const test = require('ava')
const almostEqual = require('almost-equal')
const tri = require('../')

test('should support timeout for single attempt', (t) => {
  return tri(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, 500)
    })
  }, {
    delay: 0,
    attemptTimeout: 100,
    maxAttempts: 3
  }).then(() => {
    throw new Error('Should not get here')
  }).catch((err) => {
    t.is(err.code, 'ATTEMPT_TIMEOUT')
  })
})

test('should support timeout for multiple attempts', (t) => {
  return tri(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, 500)
    })
  }, {
    delay: 0,
    attemptTimeout: 100,
    maxAttempts: 1
  }).then(() => {
    throw new Error('Should not get here')
  }).catch((err) => {
    t.is(err.code, 'ATTEMPT_TIMEOUT')
  })
})

test('should support retries', (t) => {
  let attemptNum = 0
  const resultMessage = 'hello'

  return tri(() => {
    attemptNum++

    if (attemptNum === 5) {
      return Promise.resolve(resultMessage)
    } else {
      return Promise.reject(new Error('not done'))
    }
  }, {
    delay: 0,
    maxAttempts: 5
  }).then((result) => {
    t.is(result, resultMessage)
  })
})

test('should not exceed maximum retries', (t) => {
  let attemptNum = 0

  return tri(() => {
    attemptNum++

    if (attemptNum === 5) {
      // We should never get here because we will only be
      // called up to 4 times
      return Promise.resolve()
    } else {
      return Promise.reject(new Error('FAILED'))
    }
  }, {
    delay: 0,
    maxAttempts: 4
  }).then(() => {
    throw new Error('Should not get here')
  }).catch((err) => {
    t.is(err.message, 'FAILED')
  })
})

test('should support factor property', (t) => {
  let attemptNum = 0

  let expectedDelays = [
    0,
    100,
    200,
    400,
    800
  ]

  let lastTime = Date.now()

  return tri(() => {
    let newTime = Date.now()
    let diff = newTime - lastTime
    lastTime = newTime

    t.true(almostEqual(diff, expectedDelays[attemptNum], 20))

    attemptNum++

    if (attemptNum === 4) {
      // We should never get here because we will only be
      // called up to 4 times
      return Promise.resolve()
    } else {
      return Promise.reject(new Error('FAILED'))
    }
  }, {
    maxAttempts: 0,
    delay: 100,
    factor: 2
  })
})

test('should support maximum delay', (t) => {
  let attemptNum = 0

  let expectedDelays = [
    0,
    100,
    200,
    400,
    800
  ]

  let lastTime = Date.now()

  return tri(() => {
    let newTime = Date.now()
    let diff = newTime - lastTime
    lastTime = newTime

    t.true(almostEqual(diff, Math.min(expectedDelays[attemptNum], 200), 50))

    attemptNum++

    if (attemptNum === 4) {
      // We should never get here because we will only be
      // called up to 4 times
      return Promise.resolve()
    } else {
      return Promise.reject(new Error('FAILED'))
    }
  }, {
    maxAttempts: 0,
    delay: 100,
    maxDelay: 200,
    factor: 2
  })
})

test('should support jitter property', (t) => {
  let attemptNum = 0

  let expectedDelays = [
    0,
    100,
    200,
    400,
    800
  ]

  let lastTime = Date.now()

  return tri(() => {
    let newTime = Date.now()
    let diff = newTime - lastTime
    lastTime = newTime

    if (attemptNum > 0) {
      t.true(diff <= (expectedDelays[attemptNum] + 50))
    }

    attemptNum++

    if (attemptNum === 4) {
      // We should never get here because we will only be
      // called up to 4 times
      return Promise.resolve()
    } else {
      return Promise.reject(new Error('FAILED'))
    }
  }, {
    maxAttempts: 0,
    delay: 100,
    factor: 2,
    jitter: true
  })
})
