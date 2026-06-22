// SVG chord-diagram builders — for inline display and for exporting a printable
// chord chart you can play from.

import { NOTE_NAMES } from "./theory";
import { guitarFretsByName, chordPcsByName, type GuitarShape } from "./engineAdapter";

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

/** A play-along sheet: title + key/tempo header + a body of lines. A line that
 *  is only a [Section] tag becomes an accent header; everything else (lyrics
 *  with inline [Chord] tags) is rendered as-is. */
export function sheetSvg(o: { title: string; subtitle: string; body: string }): { svg: string; width: number; height: number } {
  const W = 760, pad = 28;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let y = pad + 8;
  const rows: string[] = [];
  rows.push(`<text x="${pad}" y="${y}" fill="${DOT}" font-size="24" font-weight="bold" font-family="monospace">${esc(o.title)}</text>`);
  y += 22;
  rows.push(`<text x="${pad}" y="${y}" fill="${LINE}" font-size="12" font-family="monospace">${esc(o.subtitle)}</text>`);
  y += 18;
  rows.push(`<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="${LINE}"/>`);
  y += 14;
  for (const raw of o.body.split("\n")) {
    const t = raw.trim();
    if (t === "") { y += 9; continue; }
    if (/^\[[^\]]+\]$/.test(t)) {
      y += 8;
      rows.push(`<text x="${pad}" y="${y}" fill="${DOT}" font-size="14" font-weight="bold" font-family="monospace">${esc(t.replace(/^\[|\]$/g, ""))}</text>`);
      y += 18;
    } else {
      rows.push(`<text x="${pad}" y="${y}" fill="${INK}" font-size="13" font-family="monospace">${esc(raw)}</text>`);
      y += 17;
    }
  }
  const H = y + pad;
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="#0e0f10"/>${rows.join("")}</svg>`;
  return { svg, width: W, height: H };
}

/** Inner SVG for a one-octave piano voicing at (ox,oy). ~74 wide. */
export function pianoInner(pcs: number[], ox = 0, oy = 0): string {
  const set = new Set(pcs);
  const w = 10, whites = [0, 2, 4, 5, 7, 9, 11];
  const blacks: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
  let s = "";
  whites.forEach((pc, i) => { s += `<rect x="${ox + i * w}" y="${oy}" width="${w}" height="44" fill="${set.has(pc) ? DOT : "#16181a"}" stroke="${LINE}"/>`; });
  Object.keys(blacks).forEach((k) => { const pc = Number(k); s += `<rect x="${ox + (blacks[pc] + 1) * w - 3}" y="${oy}" width="6" height="28" fill="${set.has(pc) ? "#8aa92c" : "#000"}" stroke="${LINE}"/>`; });
  return s;
}

const ROOT_COL = "#c8ff3d", SCALE_COL = "#5cff9d";
function scaleSet(rootPc: number, mode: "major" | "minor"): Set<number> {
  const steps = mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  return new Set(steps.map((st) => (rootPc + st) % 12));
}

/** Full guitar neck (6×15) with the whole key scale marked (root highlighted). */
function scaleNeckInner(rootPc: number, mode: "major" | "minor", ox: number, oy: number): { markup: string; height: number } {
  const TUNE = [4, 9, 2, 7, 11, 4]; // low E→high e pitch classes
  const FRETS = 15, nutX = ox + 24, fw = 46, sg = 20, top = oy + 12;
  const scale = scaleSet(rootPc, mode);
  const yOf = (s: number) => top + (5 - s) * sg; // low E at bottom
  let m = "";
  for (let s = 0; s < 6; s++) m += `<line x1="${nutX}" y1="${yOf(s)}" x2="${nutX + FRETS * fw}" y2="${yOf(s)}" stroke="${LINE}"/>`;
  m += `<line x1="${nutX}" y1="${yOf(5)}" x2="${nutX}" y2="${yOf(0)}" stroke="${INK}" stroke-width="3"/>`;
  for (let f = 1; f <= FRETS; f++) {
    m += `<line x1="${nutX + f * fw}" y1="${yOf(5)}" x2="${nutX + f * fw}" y2="${yOf(0)}" stroke="${LINE}"/>`;
    m += `<text x="${nutX + (f - 0.5) * fw}" y="${yOf(0) + 16}" fill="${LINE}" font-size="9" text-anchor="middle" font-family="monospace">${f}</text>`;
  }
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= FRETS; f++) {
      const pc = (TUNE[s] + f) % 12;
      if (!scale.has(pc)) continue;
      const cx = f === 0 ? nutX - 12 : nutX + (f - 0.5) * fw;
      const cy = yOf(s);
      const root = pc === rootPc;
      m += `<circle cx="${cx}" cy="${cy}" r="8.5" fill="${root ? ROOT_COL : SCALE_COL}"/>`;
      m += `<text x="${cx}" y="${cy + 3}" fill="#11140a" font-size="8" font-weight="bold" text-anchor="middle" font-family="monospace">${NOTE_NAMES[pc]}</text>`;
    }
  }
  return { markup: m, height: 5 * sg + 30 };
}

/** One-octave piano with the whole key scale highlighted (root brighter). */
function scalePianoInner(rootPc: number, mode: "major" | "minor", ox: number, oy: number): { markup: string; height: number } {
  const scale = scaleSet(rootPc, mode);
  const w = 22, whites = [0, 2, 4, 5, 7, 9, 11];
  const blacks: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
  let m = "";
  whites.forEach((pc, i) => { const on = scale.has(pc); m += `<rect x="${ox + i * w}" y="${oy}" width="${w}" height="70" fill="${pc === rootPc ? ROOT_COL : on ? SCALE_COL : "#16181a"}" stroke="${LINE}"/>`; if (on) m += `<text x="${ox + i * w + w / 2}" y="${oy + 62}" fill="#11140a" font-size="9" text-anchor="middle" font-family="monospace">${NOTE_NAMES[pc]}</text>`; });
  Object.keys(blacks).forEach((k) => { const pc = Number(k); const on = scale.has(pc); m += `<rect x="${ox + (blacks[pc] + 1) * w - 7}" y="${oy}" width="14" height="44" fill="${pc === rootPc ? ROOT_COL : on ? "#8aa92c" : "#000"}" stroke="${LINE}"/>`; });
  return { markup: m, height: 80 };
}

type PASection = { label: string; chords: string[]; lyrics: string[] };

/** Play-along sheet: per section, a row of chord DIAGRAMS (guitar or piano) with
 *  the lyrics inline below. Renders inline and exports to PNG. */
export function playAlongSvg(o: { title: string; subtitle: string; instrument: "guitar" | "piano"; rootPc: number; mode: "major" | "minor"; sections: PASection[] }): { svg: string; width: number; height: number } {
  const W = 760, pad = 24;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const guitar = o.instrument === "guitar";
  const cellW = guitar ? 92 : 80, cellH = guitar ? 108 : 60;
  let y = pad + 8;
  const rows: string[] = [];
  rows.push(`<text x="${pad}" y="${y}" fill="${DOT}" font-size="24" font-weight="bold" font-family="monospace">${esc(o.title)}</text>`); y += 22;
  rows.push(`<text x="${pad}" y="${y}" fill="${LINE}" font-size="12" font-family="monospace">${esc(o.subtitle)}</text>`); y += 18;
  // whole-key scale across the neck (root highlighted)
  rows.push(`<text x="${pad}" y="${y}" fill="${INK}" font-size="11" font-weight="bold" font-family="monospace">SCALE — ${NOTE_NAMES[o.rootPc]} ${o.mode}</text>`); y += 6;
  const sc = guitar ? scaleNeckInner(o.rootPc, o.mode, pad, y) : scalePianoInner(o.rootPc, o.mode, pad, y);
  rows.push(sc.markup); y += sc.height + 12;

  for (const sec of o.sections) {
    rows.push(`<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="${LINE}"/>`); y += 18;
    rows.push(`<text x="${pad}" y="${y}" fill="${INK}" font-size="14" font-weight="bold" font-family="monospace">${esc(sec.label)}</text>`); y += 8;
    // chord diagram row(s)
    let x = pad;
    if (sec.chords.length) {
      let rowTop = y;
      for (const name of sec.chords) {
        if (x + cellW > W - pad) { x = pad; rowTop += cellH + 8; }
        rows.push(`<text x="${x + cellW / 2}" y="${rowTop + 12}" fill="${INK}" font-size="12" font-weight="bold" text-anchor="middle" font-family="monospace">${esc(name)}</text>`);
        if (guitar) rows.push(guitarInner(guitarFretsByName(name), x, rowTop + 4));
        else rows.push(pianoInner(chordPcsByName(name), x + 6, rowTop + 18));
        x += cellW + 8;
      }
      y = rowTop + cellH + 8;
    }
    // lyrics
    for (const line of sec.lyrics) {
      rows.push(`<text x="${pad}" y="${y}" fill="${INK}" font-size="13" font-family="monospace">${esc(line)}</text>`);
      y += 17;
    }
    y += 14;
  }
  const H = y + pad;
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#0e0f10"/>${rows.join("")}</svg>`;
  return { svg, width: W, height: H };
}

/** Rasterize an SVG to PNG and download it. */
export function downloadPng(svg: string, width: number, height: number, filename: string, scale = 2) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
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
