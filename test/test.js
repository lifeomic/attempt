'use strict';

const chai = require('chai');
const expect = chai.expect;

const tri = require('../');

describe('Tri tests', function () {
  this.timeout(10000);

  it('should support timeout for single attempt', function () {
    return tri(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 500);
      });
    }, {
      delay: 0,
      attemptTimeout: 100,
      maxAttempts: 3
    }).then(() => {
      throw new Error('Should not get here');
    }).catch((err) => {
      expect(err.code).to.equal('ATTEMPT_TIMEOUT');
    });
  });

  it('should support timeout for multiple attempts', function () {
    return tri(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 500);
      });
    }, {
      delay: 0,
      attemptTimeout: 100,
      maxAttempts: 1
    }).then(() => {
      throw new Error('Should not get here');
    }).catch((err) => {
      expect(err.code).to.equal('ATTEMPT_TIMEOUT');
    });
  });

  it('should support retries', function () {
    let attemptNum = 0;

    return tri(() => {
      attemptNum++;

      if (attemptNum === 5) {
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('not ready'));
      }
    }, {
      delay: 0,
      maxAttempts: 5
    });
  });

  it('should not exceed maximum retries', function () {
    let attemptNum = 0;

    return tri(() => {
      attemptNum++;

      if (attemptNum === 5) {
        // We should never get here because we will only be
        // called up to 4 times
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('FAILED'));
      }
    }, {
      delay: 0,
      maxAttempts: 4
    }).then(() => {
      throw new Error('Should not get here');
    }).catch((err) => {
      expect(err.message).to.equal('FAILED');
    });
  });

  it('should support factor property', function () {
    let attemptNum = 0;

    let expectedDelays = [
      0,
      100,
      200,
      400,
      800
    ];

    let lastTime = Date.now();

    return tri(() => {
      let newTime = Date.now();
      let diff = newTime - lastTime;
      lastTime = newTime;

      expect(diff).to.be.closeTo(expectedDelays[attemptNum], 20);

      attemptNum++;

      if (attemptNum === 4) {
        // We should never get here because we will only be
        // called up to 4 times
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('FAILED'));
      }
    }, {
      maxAttempts: 0,
      delay: 100,
      factor: 2
    });
  });

  it('should support maximum delay', function () {
    let attemptNum = 0;

    let expectedDelays = [
      0,
      100,
      200,
      400,
      800
    ];

    let lastTime = Date.now();

    return tri(() => {
      let newTime = Date.now();
      let diff = newTime - lastTime;
      lastTime = newTime;

      expect(diff).to.be.closeTo(Math.min(expectedDelays[attemptNum], 200), 50);

      attemptNum++;

      if (attemptNum === 4) {
        // We should never get here because we will only be
        // called up to 4 times
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('FAILED'));
      }
    }, {
      maxAttempts: 0,
      delay: 100,
      maxDelay: 200,
      factor: 2
    });
  });

  it('should support jitter property', function () {
    let attemptNum = 0;

    let expectedDelays = [
      0,
      100,
      200,
      400,
      800
    ];

    let lastTime = Date.now();

    return tri(() => {
      let newTime = Date.now();
      let diff = newTime - lastTime;
      lastTime = newTime;

      if (attemptNum > 0) {
        expect(diff).to.be.at.most(expectedDelays[attemptNum] + 50);
      }

      attemptNum++;

      if (attemptNum === 4) {
        // We should never get here because we will only be
        // called up to 4 times
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('FAILED'));
      }
    }, {
      maxAttempts: 0,
      delay: 100,
      factor: 2,
      jitter: true
    });
  });
});
