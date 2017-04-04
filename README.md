# tri

[![Build Status](https://travis-ci.org/austinkelleher/tri.svg)](https://travis-ci.org/austinkelleher/tri)
![NPM version](https://badge.fury.io/js/tri.svg)

Try to execute a JavaScript function

## Installation

```bash
npm install tri --save
```

## Usage

```js
const tri = require('tri');

tri(function() {
  return Promise.resolve();
}, {
  maxAttempts: 0,
  delay: 100,
  factor: 2,
  jitter: true
});
```
