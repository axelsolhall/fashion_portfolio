// Photo fingerprint used to spot the same photo delivered twice (A-23).
// A 16×16 greyscale thumbnail, normalised to zero mean / unit variance (so brightness and contrast changes cancel out);
// distance = mean absolute difference. Measured on the 162 site photos (npm run eval:ingest):
//   re-saved copy (900px WebP q50) ≤ 0.11 · copy cropped 2% ≤ 0.19 · two different photos ≥ 0.31.
// (A 64-bit dHash was tried first and missed 55/162 re-saved copies: pale studio backgrounds flip its bits.)
import sharp from 'sharp';

const N = 16;
export async function fingerprint(input) {
  const small = await sharp(input, { failOn: 'none', limitInputPixels: false }).rotate().greyscale().resize(64, 64, { fit: 'fill' }).toBuffer();
  const a = Float32Array.from(await sharp(small).resize(N, N, { fit: 'fill', kernel: 'cubic' }).raw().toBuffer());
  const m = a.reduce((x, y) => x + y) / a.length, sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) || 1;
  return a.map(v => (v - m) / sd);
}
export const distance = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return +(s / a.length).toFixed(3); };
