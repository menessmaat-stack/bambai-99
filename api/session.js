/* POST /api/session  { token, sessionId, seconds }
 *
 * The game posts this when a session starts and then once a minute while it is
 * being played, with the running total of seconds. Each post is its own blob, so
 * nothing is ever read-modify-written and a lost heartbeat costs one minute of
 * resolution instead of the whole session; /api/stats takes the largest
 * `seconds` it finds per session.
 */
const { put, readToken, body, send } = require('./_lib');

const SESSION_RE = /^[a-z0-9]{6,32}$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });

  const data = await body(req);
  const id = readToken(data.token);
  if (!id) return send(res, 401, { error: 'Sign in first' });

  const sessionId = String(data.sessionId || '').toLowerCase();
  if (!SESSION_RE.test(sessionId)) return send(res, 400, { error: 'Bad sessionId' });

  // Clamped so a tampered client cannot claim a 400-hour session.
  const seconds = Math.max(0, Math.min(12 * 3600, Math.round(Number(data.seconds) || 0)));

  try {
    await put(`events/${id}__${sessionId}/${String(seconds).padStart(6, '0')}.json`, {
      player: id,
      session: sessionId,
      seconds,
      at: new Date().toISOString()
    });
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error('[session]', err);
    return send(res, 500, { error: 'Storage unavailable' });
  }
};
