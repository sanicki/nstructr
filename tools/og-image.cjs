/* The link-preview image (Open Graph, 1200 × 630): a row of library figures in their held poses on the app icon's navy,
   with its sound-wave bars behind. Drawn at build time with the engine (src/core.js) and written as a PNG with Node's
   own zlib: the figure is only thick round-ended lines and circles, so a small anti-aliased renderer does it, with
   no image library. The build writes _site/og.png; `node tools/og-image.cjs out.png` writes one to look at. */
const zlib = require('node:zlib');
const C = require('../src/core.js');

const W = 1200, H = 630;
// the app icon's colours: navy, white figure, grey bars; the right limbs in the app's light-theme-on-dark blue
const NAVY = [14, 38, 72], BAR = [104, 120, 145], FLOORC = [63, 88, 124];
const COL = { body: [255, 255, 255], armR: [160, 202, 253], legR: [160, 202, 253], armL: [214, 190, 228], legL: [214, 190, 228] };
// varied and readable from where the app shows them: a squat, Warrior II, Tree, Downward Dog
const PICKS = ['bw-squat', 'yoga-warrior-2', 'yoga-tree', 'yoga-downward-dog'];

function canvas() {
  const px = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) px.set(NAVY, i * 3);
  // paint every pixel within r of the segment a-b (a circle when a = b), edges anti-aliased
  const capsule = (a, b, r, col, alpha = 1) => {
    const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) - r - 1)), x1 = Math.min(W - 1, Math.ceil(Math.max(a.x, b.x) + r + 1));
    const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) - r - 1)), y1 = Math.min(H - 1, Math.ceil(Math.max(a.y, b.y) + r + 1));
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px_ = x + 0.5, py = y + 0.5, t = L2 ? Math.max(0, Math.min(1, ((px_ - a.x) * dx + (py - a.y) * dy) / L2)) : 0;
      const d = Math.hypot(px_ - (a.x + t * dx), py - (a.y + t * dy)), c = Math.max(0, Math.min(1, r - d + 0.5)) * alpha;
      if (c <= 0) continue;
      const i = (y * W + x) * 3;
      for (let k = 0; k < 3; k++) px[i + k] += (col[k] - px[i + k]) * c;
    }
  };
  return { px, capsule };
}

function png(px) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = Math.round(Math.max(0, Math.min(255, px[y * W * 3 + x]))); }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4), t = Buffer.from(type), cr = Buffer.alloc(4); len.writeUInt32BE(data.length); cr.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;   // 8-bit RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* exercises: the library (plain objects, as the build loads them) */
function ogImage(exercises) {
  const seg = C.DEFAULT_SEGMENTS, figs = [];
  for (const id of PICKS) {
    const ex = exercises.find(e => e.id === id); if (!ex) continue;
    const R = C.resolveSequence(ex.keyframes, seg, ex, ex.props);
    // the held pose, as the thumbnails pick it (latest on a tie)
    let i = 0; ex.keyframes.forEach((k, j) => { if ((k.holdMs || 0) >= (ex.keyframes[i].holdMs || 0)) i = j; });
    const r = R[i];                                                      // (none of them stands on a surface)
    const Q = C.project(C.fkAt(r.pose, seg, C.place(r.pose, seg, r.rule)), r.cam);
    const xs = Object.values(Q).map(p => p.x), top = Math.min(...Object.values(Q).map(p => p.y)) - seg.head;
    figs.push({ Q, minX: Math.min(...xs) - 8, maxX: Math.max(...xs) + 8, top });
  }
  const { px, capsule } = canvas();
  // the sound-wave bars, faint, across the middle (as in the icon)
  const mid = 290;
  for (let k = 0, n = 23; k < n; k++) {
    const x = 60 + k * (W - 120) / (n - 1), h = 40 + 150 * Math.abs(Math.sin(k * 1.7)) * (1 - Math.abs(k - (n - 1) / 2) / n);
    capsule({ x, y: mid - h }, { x, y: mid + h }, 9, BAR, 0.35);
  }
  // one scale for all: the tallest fits the height and the row fits the width (margins 80, gaps at least 50); spaced
  // evenly along the floor
  const floor = 540, FLOOR = C.FLOOR, units = figs.reduce((a, f) => a + f.maxX - f.minX, 0);
  const s = Math.min((floor - 90) / Math.max(...figs.map(f => FLOOR - f.top)), (W - 160 - 50 * (figs.length - 1)) / units);
  const widths = figs.map(f => (f.maxX - f.minX) * s), gap = (W - 160 - widths.reduce((a, b) => a + b, 0)) / (figs.length - 1);
  capsule({ x: 50, y: floor + 7 * s }, { x: W - 50, y: floor + 7 * s }, 3, FLOORC);
  let x = 80;
  for (const [n, f] of figs.entries()) {
    const at = p => ({ x: x + (p.x - f.minX) * s, y: floor - (FLOOR - p.y) * s });
    for (const id of C.boneOrder(f.Q)) {
      const bn = C.BONES.find(b => b.id === id);
      capsule(at(f.Q[bn.a]), at(f.Q[bn.b]), 5.5 * s, COL[bn.part]);
      if (bn.b === 'head') capsule(at(f.Q.head), at(f.Q.head), seg.head * s, COL.body);
    }
    x += widths[n] + gap;
  }
  return png(px);
}
module.exports = { ogImage, W, H };

if (require.main === module) {
  const fs = require('node:fs'), path = require('node:path'), dir = path.join(__dirname, '../library/exercises');
  const lib = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  fs.writeFileSync(process.argv[2] || 'og.png', ogImage(lib));
}
