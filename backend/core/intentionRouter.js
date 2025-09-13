const Consts = require('./intentionConsts');

const functionMap = new Map();

let notFoundHandler = null;
let fallbackHandler = null;

const safeCall = async (fn, payload, context) => {
  try {
    return await fn(payload, context);
  } catch (err) {
    context.logger && context.logger.error && context.logger.error(err);
    return {
      ok: false,
      error: { code: 'handler.error', message: err.message || 'Unhandled error' }
    };
  }
};

const executeFunction = async (intent, payload, context) => {
  const intendedFunction = functionMap.get(intent);
  if (intendedFunction) {
    return safeCall(intendedFunction, payload, context);
  }
  if (notFoundHandler) {
    return safeCall(notFoundHandler, { intent, payload }, context);
  }
  if (fallbackHandler) {
    return safeCall(fallbackHandler, { intent, payload }, context);
  }
  // Last resort
  return { ok: false, error: { code: 'intent.notFound', message: `No handler for intent ${intent}` } };
};

module.exports = {
  set: (intent, func) => {
    functionMap.set(intent, func);
  },
  setNotFound: (func) => {
    notFoundHandler = func;
  },
  setFallback: (func) => {
    fallbackHandler = func;
  },
  dispatch: (intent, payload, context) => executeFunction(intent, payload, context),
  Consts
};

