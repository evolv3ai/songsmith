// Guitar fingerings for a chord. Returns MULTIPLE voicings to cycle through:
// the familiar open shape (when one exists) plus the movable A-shape and
// E-shape barre positions. Exotic qualities we can't shape return [] and the UI
// falls back to the piano voicing (so we never show a wrong shape).
//
// Standard tuning low→high: E A D G B e  (pitch classes 4 9 2 7 11 4)

import { parseChord, NOTE_NAMES } from "./theory";

export type GuitarShape = {
  frets: number[]; // absolute fret per string low E→high e; -1 = muted, 0 = open
  baseFret: number;
  label: string;
};

function shape(frets: number[], label: string): GuitarShape {
  const pressed = frets.filter((f) => f > 0);
  const baseFret = pressed.length && Math.max(...pressed) > 4 ? Math.min(...pressed) : 1;
  return { frets, baseFret, label };
}

// Familiar open / common shapes, keyed by canonical chord name.
const OPEN: Record<string, number[]> = {
  C: [-1, 3, 2, 0, 1, 0], A: [-1, 0, 2, 2, 2, 0], G: [3, 2, 0, 0, 0, 3], E: [0, 2, 2, 1, 0, 0], D: [-1, -1, 0, 2, 3, 2],
  Am: [-1, 0, 2, 2, 1, 0], Em: [0, 2, 2, 0, 0, 0], Dm: [-1, -1, 0, 2, 3, 1],
  C7: [-1, 3, 2, 3, 1, 0], A7: [-1, 0, 2, 0, 2, 0], G7: [3, 2, 0, 0, 0, 1], E7: [0, 2, 0, 1, 0, 0], D7: [-1, -1, 0, 2, 1, 2], B7: [-1, 2, 1, 2, 0, 2],
  Am7: [-1, 0, 2, 0, 1, 0], Em7: [0, 2, 0, 0, 0, 0], Dm7: [-1, -1, 0, 2, 1, 1],
  Cmaj7: [-1, 3, 2, 0, 0, 0], Amaj7: [-1, 0, 2, 1, 2, 0], Dmaj7: [-1, -1, 0, 2, 2, 2], Emaj7: [0, 2, 1, 1, 0, 0], Fmaj7: [-1, -1, 3, 2, 1, 0], Gmaj7: [3, 2, 0, 0, 0, 2],
};

// movable offsets from the root fret (low E → high e); -1 = muted
const E_SHAPES: Record<string, number[]> = { "": [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], "7": [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0], maj7: [0, 2, 1, 1, 0, 0] };
const A_SHAPES: Record<string, number[]> = { "": [-1, 0, 2, 2, 2, 0], m: [-1, 0, 2, 2, 1, 0], "7": [-1, 0, 2, 0, 2, 0], m7: [-1, 0, 2, 0, 1, 0], maj7: [-1, 0, 2, 1, 2, 0] };

/** All reasonable voicings for a chord name, lowest position first. */
export function guitarVoicings(name: string): GuitarShape[] {
  const c = parseChord(name);
  if (!c) return [];
  const out: GuitarShape[] = [];
  const seen = new Set<string>();
  const push = (s: GuitarShape) => { const k = s.frets.join(","); if (!seen.has(k)) { seen.add(k); out.push(s); } };

  const canonical = NOTE_NAMES[c.rootPc] + c.quality;
  if (OPEN[canonical]) push(shape(OPEN[canonical], "Open"));

  if (c.quality in E_SHAPES) {
    const fE = (c.rootPc - 4 + 12) % 12; // root on low E
    const fA = (c.rootPc - 9 + 12) % 12; // root on A
    if (fA > 0) push(shape(A_SHAPES[c.quality].map((o) => (o < 0 ? -1 : fA + o)), `A-shape · ${fA}fr`));
    if (fE > 0) push(shape(E_SHAPES[c.quality].map((o) => (o < 0 ? -1 : fE + o)), `E-shape · ${fE}fr`));
  }
  return out.sort((a, b) => {
    const fa = Math.min(...a.frets.filter((f) => f > 0).concat(99));
    const fb = Math.min(...b.frets.filter((f) => f > 0).concat(99));
    return fa - fb;
  });
}

/** Best single voicing (open/lowest), for chips and export charts. */
export function guitarShape(name: string): GuitarShape | null {
  return guitarVoicings(name)[0] ?? null;
}
