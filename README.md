tri
===========
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
