"use strict";

// CJS shim that lazy-loads the ESM module.
// Works on modern Node without extra deps.
exports.initLLM = (...args) =>
  import("./index.esm.js").then(m => m.initLLM(...args));

exports.useLLM = (...args) =>
  import("./index.esm.js").then(m => m.useLLM(...args));
