/* POST /api/account  { mode: "signup" | "login", id, pin }
 *
 * Accounts are a player id and a PIN, nothing else: no email, no Google, no
 * password reset. The PIN is only there so a returning player keeps the same
 * id (and therefore the same play-time total) instead of someone else taking it.
 */
const { ID_RE, put, getPlayer, pinHash, issueToken, body, send } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });

  const data = await body(req);
  const mode = data.mode === 'signup' ? 'signup' : 'login';
  const id = String(data.id || '').trim().toLowerCase();
  const pin = String(data.pin || '');

  if (!ID_RE.test(id)) {
    return send(res, 400, { error: 'Player id must be 3-16 characters: a-z, 0-9 or _' });
  }
  if (pin.length < 4 || pin.length > 32) {
    return send(res, 400, { error: 'PIN must be 4-32 characters' });
  }

  try {
    const existing = await getPlayer(id);

    if (mode === 'signup') {
      if (existing) return send(res, 409, { error: 'That id is taken. Log in or pick another.' });
      await put(`players/${id}.json`, {
        id,
        pin: pinHash(id, pin),
        createdAt: new Date().toISOString()
      });
      return send(res, 200, { id, token: issueToken(id), created: true });
    }

    if (!existing) return send(res, 404, { error: 'No such player. Create the id first.' });
    if (existing.pin !== pinHash(id, pin)) return send(res, 401, { error: 'Wrong PIN.' });
    return send(res, 200, { id, token: issueToken(id), created: false });
  } catch (err) {
    console.error('[account]', err);
    return send(res, 500, { error: 'Storage unavailable' });
  }
};
