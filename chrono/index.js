// chrono-index.js — Pass 1: read-only indexer. Modifies NOTHING.
import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
// + your EXIF reader of choice (reading only for now)

const IMAGE_EXTS = new Set([/* .jpg .jpeg .png .heic ... */]);
const VIDEO_EXTS = new Set([/* .mp4 .mov ... */]); // decide: index videos now or later?

// Recursively yield absolute file paths under root.
async function* walk(dir) {
  // TODO: fs.readdir(dir, { withFileTypes: true })
  //       recurse into dirs, yield files whose ext is in IMAGE/VIDEO sets
}

// SHA-256 of file contents. STREAM it — videos will blow up readFile.
function hashFile(filePath) {
  // TODO: createReadStream -> hash.update -> resolve hex digest
}

// (A) YOURS TO WRITE — path → date, your conventions only you know.
// A relPath could be any of:
//   2013/06/12/foo.jpg        (old day-folder era)
//   2013/06/foo.jpg           (month only)
//   2013/06/Birthday/foo.jpg  (event subfolder)
//   2026/05/pets/foo.jpg      (new topic era)
// Find year + month robustly; take day ONLY when a segment is a bare 1–31.
// Ignore non-numeric segments (event/topic names) for date purposes.
function dateFromPath(relPath) {
  // TODO -> { y, m, d? } | null
}

// (B) date resolution: EXIF first, path fallback, then give up.
async function resolveDate(filePath, relPath) {
  // TODO: read EXIF DateTimeOriginal; if present -> source 'exif'
  //       else dateFromPath -> source 'path'
  //       else -> source 'none'
  // return { date, source }  // date may be null
}

// Intended canonical name. DON'T dedup here — just compute the intent.
// Collisions get flagged in the index for step-2 review, not silently fixed.
function intendedName(date, source, ext) {
  // exif w/ time -> YYYYMMDD_HHMMSS.ext
  // path-only    -> YYYYMMDD.ext  (no time available; seq added in step 3)
}

async function buildIndex(root) {
  const records = [];
  for await (const filePath of walk(root)) {
    const relPath = path.relative(root, filePath);
    const ext = path.extname(filePath).toLowerCase();
    // TODO: hash, resolveDate, dimensions (EXIF gives image dims on the read),
    //       intendedName, current filename
    records.push({
      relPath,                 // where it lives now
      hash: /* */ '',          // join key for byte-identical favorites
      currentName: /* */ '',
      intendedName: /* */ '',
      date: /* ISO or null */ null,
      dateSource: /* exif|path|none */ '',
      width: null, height: null, // ranking signal for fuzzy favorites later
      hadMetadata: /* dateSource === 'exif' */ false,
    });
  }
  return records;
}

async function main() {
  const root = process.argv[2]; // pass chrono root as arg
  const records = await buildIndex(root);
  await fs.writeFile('chrono-index.json', JSON.stringify(records, null, 2));
  // TODO: print a summary — counts by dateSource, intendedName collisions,
  //       and any 'none' files so you see the damage before pass 3 writes.
}
main();