#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; }
      else { args[key] = true; }
    }
  }
  return args;
}

function readIfFileOrValue(val) {
  if (!val) return null;
  try {
    if (fs.existsSync(val)) {
      return fs.readFileSync(path.resolve(val), 'utf8');
    }
  } catch (_) {}
  return val;
}

function parseCSV(val) {
  if (!val) return undefined;
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = Math.floor(Date.now() / 1000);

  const sub = args.sub || 'user-dev';
  const playerId = args.playerId || sub;
  const roles = parseCSV(args.roles);
  const claims = parseCSV(args.claims);
  const permissionsVersion = Number(args.permissionsVersion || 1);

  const ttl = args.ttl || '10m'; // jsonwebtoken supports string format

  // Signing material
  const secret = readIfFileOrValue(args.secret || process.env.JWT_SECRET || process.env.JWT_SHARED_SECRET);
  const privateKey = readIfFileOrValue(args.privateKey || process.env.JWT_PRIVATE_KEY);

  let algorithm, key;
  if (privateKey) {
    algorithm = 'RS256';
    key = privateKey;
  } else if (secret) {
    algorithm = 'HS256';
    key = secret;
  } else {
    console.error('Provide --secret for HS256 or --privateKey for RS256 (or set JWT_SECRET / JWT_PRIVATE_KEY env vars).');
    process.exit(1);
  }

  const payload = { sub, playerId, permissionsVersion };
  if (roles) payload.roles = roles;
  if (claims) payload.claims = claims;

  const token = jwt.sign(payload, key, { algorithm, expiresIn: ttl });

  console.log('\nIssued JWT');
  console.log('algorithm:', algorithm);
  console.log('sub:', sub);
  console.log('roles:', roles || []);
  console.log('claims:', claims || []);
  console.log('expiresIn:', ttl);
  console.log('\n' + token + '\n');
}

main();

