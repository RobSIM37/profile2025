// db.js
/* eslint-disable no-console */
const sql = require('mssql');
const {
  ManagedIdentityCredential,
  AzureCliCredential,
  DefaultAzureCredential,
} = require('@azure/identity');

const SCOPE = 'https://database.windows.net/.default';

const isProd = process.env.NODE_ENV === 'production';
const useAAD = process.env.USE_AAD === '1';
const miClientId = process.env.AZURE_CLIENT_ID || undefined; // for user-assigned MI

// ---- token cache (refresh 5m before expiry) -------------------------------
let cachedAccessToken = null; // { token, expiresOnTimestamp }
const SKEW_MS = 5 * 60 * 1000;

async function fetchAccessToken() {
  const chain = [
    () => new ManagedIdentityCredential({ clientId: miClientId }),
    () => new AzureCliCredential(),
    () => new DefaultAzureCredential(),
  ];
  let lastErr;
  for (const factory of chain) {
    try {
      const cred = factory();
      const at = await cred.getToken(SCOPE);
      return at; // { token, expiresOnTimestamp }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('No Azure credential available for SQL access token.');
}

async function getAccessToken() {
  const now = Date.now();
  if (
    cachedAccessToken &&
    now < (cachedAccessToken.expiresOnTimestamp - SKEW_MS)
  ) {
    return cachedAccessToken.token;
  }
  cachedAccessToken = await fetchAccessToken();
  return cachedAccessToken.token;
}

// ---- pool singleton -------------------------------------------------------
let poolPromise = null;

function baseConfig() {
  const required = ['DB_SERVER', 'DB_NAME'];
  for (const k of required) {
    if (!process.env[k]) {
      throw new Error(`Missing required env var: ${k}`);
    }
  }

  return {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
    },
    pool: {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      min: Number(process.env.DB_POOL_MIN ?? 0),
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS ?? 30000),
    },
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT_MS ?? 15000),
    connectionTimeout: Number(process.env.DB_CONN_TIMEOUT_MS ?? 15000),
  };
}

async function makeConfig() {
  const cfg = baseConfig();

  if (isProd || useAAD) {
    const token = await getAccessToken();
    return {
      ...cfg,
      authentication: {
        type: 'azure-active-directory-access-token',
        options: { token },
      },
    };
  }

  // Local SQL auth fallback
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error('Local SQL auth selected but DB_USER/DB_PASSWORD are missing.');
  }
  return {
    ...cfg,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const cfg = await makeConfig();
      const pool = new sql.ConnectionPool(cfg);
      pool.on('error', (err) => {
        console.error('mssql pool error:', err);
      });
      await pool.connect();
      return pool;
    })();

    // If first connect fails, allow later retries
    poolPromise.catch(() => { poolPromise = null; });
  }
  return poolPromise;
}

// ---- helpers --------------------------------------------------------------
async function query(text, inputs = []) {
  // inputs: [{ name: 'id', type: sql.Int, value: 42 }, ...]
  const pool = await getPool();
  const req = pool.request();
  for (const p of inputs) req.input(p.name, p.type, p.value);
  const result = await req.query(text);
  return result;
}

async function tx(work) {
  // work: async (req) => { ...; return result; }
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const req = new sql.Request(transaction);
    const result = await work(req, sql);
    await transaction.commit();
    return result;
  } catch (e) {
    try { await transaction.rollback(); } catch {}
    throw e;
  }
}

async function closePool() {
  try {
    const pool = await poolPromise;
    await pool?.close();
  } catch {}
  poolPromise = null;
}

process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);

module.exports = { sql, getPool, query, tx, closePool };