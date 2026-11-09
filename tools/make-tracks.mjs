/* Rebuild music/tracks.json from whatever audio sits in music/.
 *
 *   node tools/make-tracks.mjs
 *
 * The game fetches /api/helmsdeep/tracks, which vercel.json rewrites to this
 * file. Filenames become titles (dashes and underscores turn into spaces), so
 * name the files the way you want them read out in game.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const AUDIO = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.wav', '.flac', '.webm']);
const dir = join(process.cwd(), 'music');

const tracks = readdirSync(dir)
  .filter((f) => !f.startsWith('.') && AUDIO.has(extname(f).toLowerCase()))
  .sort()
  .map((f) => ({
    title: basename(f, extname(f)).replace(/[-_]+/g, ' ').trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    url: '/music/' + encodeURIComponent(f),
  }));

writeFileSync(
  join(dir, 'tracks.json'),
  JSON.stringify({ ok: true, tracks, total: tracks.length }, null, 2) + '\n'
);
console.log(`music/tracks.json: ${tracks.length} tracks`);
