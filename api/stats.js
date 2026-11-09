/* GET /api/stats?key=<HD_ADMIN_KEY>
 *
 * Aggregates the append-only event blobs into: how many people made an id, how
 * many actually played, how many sessions, and how long each player has spent
 * in the city. Blob pathnames carry everything needed, so this never downloads
 * a single event file:
 *   events/<player>__<sessionId>/<seconds>.json
 */
const { listAll, send } = require('./_lib');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://local');
  if (url.searchParams.get('key') !== process.env.HD_ADMIN_KEY) {
    return send(res, 401, { error: 'Bad key' });
  }

  try {
    const [players, events] = await Promise.all([listAll('players/'), listAll('events/')]);

    /** sessionKey -> { player, seconds, first, last } */
    const sessions = new Map();
    for (const blob of events) {
      const m = blob.pathname.match(/^events\/([a-z0-9_]+)__([a-z0-9]+)\/(\d+)\.json$/);
      if (!m) continue;
      const [, player, session, secs] = m;
      const key = `${player}__${session}`;
      const seconds = Number(secs);
      const at = blob.uploadedAt;
      const prev = sessions.get(key);
      if (!prev) {
        sessions.set(key, { player, seconds, first: at, last: at });
      } else {
        prev.seconds = Math.max(prev.seconds, seconds);
        if (at < prev.first) prev.first = at;
        if (at > prev.last) prev.last = at;
      }
    }

    const byPlayer = new Map();
    for (const s of sessions.values()) {
      const p = byPlayer.get(s.player) || { player: s.player, sessions: 0, seconds: 0, last: '' };
      p.sessions++;
      p.seconds += s.seconds;
      if (s.last > p.last) p.last = s.last;
      byPlayer.set(s.player, p);
    }

    const rows = [...byPlayer.values()].sort((a, b) => b.seconds - a.seconds);
    const totalSeconds = rows.reduce((sum, r) => sum + r.seconds, 0);

    return send(res, 200, {
      signups: players.length,
      played: rows.length,
      sessions: sessions.size,
      totalMinutes: Math.round(totalSeconds / 60),
      players: rows.map((r) => ({
        id: r.player,
        sessions: r.sessions,
        minutes: Math.round(r.seconds / 60),
        lastSeen: r.last
      }))
    });
  } catch (err) {
    console.error('[stats]', err);
    return send(res, 500, { error: 'Storage unavailable' });
  }
};
