/* GET  /api/build?token=...                      -> the player's saved city edits
 * POST /api/build  { token, rev, items, overrides } -> store them
 *
 * The editor used to live entirely in localStorage, which is keyed by origin.
 * Every Vercel deployment gets its own hostname, so opening the game from a
 * fresh deployment link - or another browser, or another machine - showed an
 * empty city and an afternoon of placements looked deleted. They were still
 * there, on a hostname nobody was looking at.
 *
 * Edits now belong to the signed-in player id instead. One blob per player,
 * read-modify-written as a whole: a city patch is a few tens of KB and the
 * editor is single-user, so there is nothing to merge. `rev` counts up on the
 * client and a write is refused if it is older than what is stored, which is
 * what stops a stale tab left open overnight from wiping a later session.
 */
const { put, list, readJson, readToken, body, send } = require('./_lib');

const MAX_ITEMS = 6000;
const MAX_BYTES = 2 * 1024 * 1024;

async function load(id) {
  const found = await list(`builds/${id}.json`);
  const blob = (found.blobs || []).find((b) => b.pathname === `builds/${id}.json`);
  return blob ? readJson(blob.url) : null;
}

module.exports = async function handler(req, res) {
  const query = req.query || {};
  const data = req.method === 'POST' ? await body(req) : {};
  const id = readToken(req.method === 'POST' ? data.token : query.token);
  if (!id) return send(res, 401, { error: 'Sign in first' });

  if (req.method === 'GET') {
    try {
      const saved = await load(id);
      return send(res, 200, saved || { rev: 0, items: [], overrides: {} });
    } catch (err) {
      console.error('[build get]', err);
      return send(res, 500, { error: 'Storage unavailable' });
    }
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'GET or POST' });

  const items = Array.isArray(data.items) ? data.items : null;
  const overrides = data.overrides && typeof data.overrides === 'object' ? data.overrides : null;
  if (!items || !overrides) return send(res, 400, { error: 'Bad payload' });
  if (items.length > MAX_ITEMS) return send(res, 413, { error: 'Too many items' });

  const rev = Math.max(0, Math.round(Number(data.rev) || 0));
  const payload = { rev, at: new Date().toISOString(), items, overrides };
  if (JSON.stringify(payload).length > MAX_BYTES) {
    return send(res, 413, { error: 'Patch too large' });
  }

  try {
    const saved = await load(id);
    // A write that is behind what is already stored is a stale tab catching
    // up, and taking it would delete work done since. The client is told the
    // winning revision so it can pull instead.
    if (saved && Number(saved.rev) > rev) {
      return send(res, 409, { error: 'Stale', rev: Number(saved.rev) });
    }
    await put(`builds/${id}.json`, payload);
    return send(res, 200, { ok: true, rev });
  } catch (err) {
    console.error('[build post]', err);
    return send(res, 500, { error: 'Storage unavailable' });
  }
};
