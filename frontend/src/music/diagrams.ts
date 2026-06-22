// SVG chord-diagram builders — for inline display and for exporting a printable
// chord chart you can play from.

import { NOTE_NAMES } from "./theory";
import type { GuitarShape } from "./guitar";
import { guitarFretsByName, chordPcsByName } from "./engineAdapter";

const INK = "#e8e6e0";
const LINE = "#5f666c";
const DOT = "#c8ff3d";

/** Inner SVG markup for one guitar voicing at offset (ox,oy). ~78x96. */
export function guitarInner(sh: GuitarShape | null, ox = 0, oy = 0): string {
  const sp = 12, left = ox + 12, top = oy + 22, rows = 5;
  if (!sh) return `<text x="${ox + 39}" y="${oy + 60}" fill="${LINE}" font-size="9" text-anchor="middle" font-family="monospace">(see piano)</text>`;
  let s = "";
  for (let i = 0; i < 6; i++) s += `<line x1="${left + i * sp}" y1="${top}" x2="${left + i * sp}" y2="${top + rows * 12}" stroke="${LINE}"/>`;
  for (let r = 0; r <= rows; r++) s += `<line x1="${left}" y1="${top + r * 12}" x2="${left + 5 * sp}" y2="${top + r * 12}" stroke="${LINE}" stroke-width="${r === 0 && sh.baseFret === 1 ? 2.5 : 1}"/>`;
  if (sh.baseFret > 1) s += `<text x="${left - 6}" y="${top + 10}" fill="${INK}" font-size="8" text-anchor="end" font-family="monospace">${sh.baseFret}</text>`;
  sh.frets.forEach((f, i) => {
    const x = left + i * sp;
    if (f === -1) s += `<text x="${x}" y="${top - 4}" fill="${LINE}" font-size="9" text-anchor="middle" font-family="monospace">×</text>`;
    else if (f === 0) s += `<circle cx="${x}" cy="${top - 6}" r="3" fill="none" stroke="${INK}"/>`;
    else { const row = f - sh.baseFret; s += `<circle cx="${x}" cy="${top + row * 12 + 6}" r="4.5" fill="${DOT}"/>`; }
  });
  return s;
}

/** Standalone SVG for a specific voicing (name + diagram + voicing label). */
export function diagramSvgShape(sh: GuitarShape | null, name: string): string {
  return `<svg width="86" height="110" viewBox="0 0 86 110" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="43" y="12" fill="${INK}" font-size="12" font-weight="bold" text-anchor="middle" font-family="monospace">${name}</text>` +
    guitarInner(sh, 0, 0) +
    (sh ? `<text x="43" y="106" fill="${LINE}" font-size="8" text-anchor="middle" font-family="monospace">${sh.label}</text>` : "") +
    `</svg>`;
}

/** Standalone SVG for a chord's best voicing (chips, etc.). */
export function diagramSvg(name: string): string {
  return diagramSvgShape(guitarFretsByName(name), name);
}

/** A printable chart for a progression (grid of best-voicing diagrams + notes). */
export function chartSvg(names: string[], title = "Chord chart"): string {
  const cols = Math.min(4, Math.max(1, names.length));
  const cw = 100, ch = 130, pad = 16, top = 40;
  const rows = Math.ceil(names.length / cols);
  const W = pad * 2 + cols * cw, H = top + pad + rows * ch;
  let body = `<rect width="${W}" height="${H}" fill="#0e0f10"/>` +
    `<text x="${pad}" y="26" fill="${DOT}" font-size="16" font-weight="bold" font-family="monospace">${title}</text>`;
  names.forEach((n, i) => {
    const cx = pad + (i % cols) * cw, cy = top + Math.floor(i / cols) * ch;
    const notes = chordPcsByName(n).map((pc) => NOTE_NAMES[pc]).join(" ");
    body += `<text x="${cx + 43}" y="${cy + 12}" fill="${INK}" font-size="13" font-weight="bold" text-anchor="middle" font-family="monospace">${n}</text>`;
    body += guitarInner(guitarFretsByName(n), cx, cy);
    body += `<text x="${cx + 43}" y="${cy + 122}" fill="${LINE}" font-size="9" text-anchor="middle" font-family="monospace">${notes}</text>`;
  });
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

export function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
