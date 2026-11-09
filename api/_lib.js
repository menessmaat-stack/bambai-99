/* Shared helpers for the three API routes.
 *
 * Storage is Vercel Blob, talked to over its REST API rather than the
 * @vercel/blob package: the site has no build step and no node_modules, and the
 * three calls we need (put, list, read) are one fetch each.
 *
 * Files are named so nothing ever has to be read-modify-written:
 *   players/<id>.json                      one per account, written once
 *   events/<sessionId>/<seconds>.json      one per heartbeat, append only
 * Play time for a session is therefore max(seconds) across its event files,
 * which is correct even if a heartbeat is lost or arrives twice.
 */
const crypto = require('crypto');

const BLOB = 'https://blob.vercel-storage.com';
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const SECRET = process.env.HD_SECRET || '';

const ID_RE = /^[a-z0-9_]{3,16}$/;

function headers() {
  return { authorization: `Bearer ${TOKEN}`, 'x-api-version': '7' };
}

async function put(pathname, value) {
  const res = await fetch(`${BLOB}/${pathname}`, {
    method: 'PUT',
    headers: {
      ...headers(),
      'x-content-type': 'application/json',
      'x-add-random-suffix': '0',
      'x-cache-control-max-age': '0'
    },
    body: JSON.stringify(value)
  });
  if (!res.ok) throw new Error(`blob put ${pathname}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function list(prefix, cursor) {
  const url = new URL(BLOB);
  url.searchParams.set('prefix', prefix);
  url.searchParams.set('limit', '1000');
  if (cursor) url.searchParams.set('cursor', cursor);
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`blob list ${prefix}: ${res.status}`);
  return res.json();
}

/** Every blob under a prefix, following the cursor. */
async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list(prefix, cursor);
    out.push(...(page.blobs || []));
    cursor = page.hasMore ? page.cursor : null;
  } while (cursor);
  return out;
}

async function readJson(url) {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

/** One blob by pathname, or null. The store is public, so this is a plain GET. */
async function getPlayer(id) {
  const found = await list(`players/${id}.json`);
  const blob = (found.blobs || []).find((b) => b.pathname === `players/${id}.json`);
  return blob ? readJson(blob.url) : null;
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function hmac(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

/** PINs are stored as an HMAC, not a bare hash: the blob store is public, and a
 *  4-digit PIN behind a plain SHA-256 would be cracked in milliseconds. */
const pinHash = (id, pin) => hmac(`pin:${id}:${pin}`);

function issueToken(id) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  return `${b64(id)}.${exp}.${hmac(`${id}.${exp}`)}`;
}

function readToken(token) {
  if (typeof token !== 'string') return null;
  const [rawId, exp, sig] = token.split('.');
  if (!rawId || !exp || !sig) return null;
  let id;
  try { id = Buffer.from(rawId, 'base64url').toString(); } catch { return null; }
  if (!ID_RE.test(id) || Number(exp) < Date.now()) return null;
  const want = hmac(`${id}.${exp}`);
  if (want.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  return id;
}

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { return {}; }
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = {
  ID_RE, put, list, listAll, readJson, getPlayer,
  pinHash, issueToken, readToken, body, send
};
