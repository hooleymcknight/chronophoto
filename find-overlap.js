// find-overlap.js — move inbox files already present in chrono into overlap/
// Modifies only the inbox folder (moves into subfolders). Chrono is read-only.
import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';

const CHRONO_ROOT = process.argv[2];   // e.g. "D:\\Photos\\chrono"
const INBOX       = process.argv[3];   // e.g. "D:\\Photos\\to March"
const DRY_RUN     = false;              // flip to false to actually move
const VERIFY_HASH = true;              // hash name-matches to catch counter-rollover collisions

const exts = new Set(['.jpg', '.jpeg', '.png', '.heic', '.mp4', '.mov']);

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (exts.has(path.extname(e.name).toLowerCase())) yield p;
  }
}

function hashFile(p) {
  return new Promise((res, rej) => {
    const h = crypto.createHash('sha256');
    createReadStream(p).on('data', d => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej);
  });
}

async function main() {
  // 1. Map every chrono filename (lowercased — Windows is case-insensitive) -> its path(s).
  const chrono = new Map();
  for await (const p of walk(CHRONO_ROOT)) {
    const k = path.basename(p).toLowerCase();
    (chrono.get(k) ?? chrono.set(k, []).get(k)).push(p);
  }

  // 2. Inbox files only at the top level (no recursion — overlap/ is created here).
  const inbox = (await fs.readdir(INBOX, { withFileTypes: true }))
    .filter(e => e.isFile() && exts.has(path.extname(e.name).toLowerCase()))
    .map(e => path.join(INBOX, e.name));

  const moves = []; // { from, toDir, reason }
  for (const f of inbox) {
    const hits = chrono.get(path.basename(f).toLowerCase());
    if (!hits) continue;                       // genuinely new -> leave in place

    let dest = 'overlap';
    if (VERIFY_HASH) {
      const fh = await hashFile(f);
      const sameBytes = await Promise.all(hits.map(hashFile)).then(hs => hs.includes(fh));
      if (!sameBytes) dest = 'name-collision'; // same name, different photo — DO NOT bulk-delete
    }
    moves.push({ from: f, toDir: path.join(INBOX, dest) });
  }

  // 3. Report, then move (unless dry run).
  console.log(`${inbox.length} inbox files, ${moves.length} already in chrono`);
  for (const m of moves) {
    console.log(`${DRY_RUN ? '[dry] ' : ''}${path.basename(m.from)} -> ${path.basename(m.toDir)}/`);
    if (!DRY_RUN) {
      await fs.mkdir(m.toDir, { recursive: true });
      await fs.rename(m.from, path.join(m.toDir, path.basename(m.from)));
    }
  }
}
main();