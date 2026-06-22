// Absolute-chord theory for the Composer. Chords are stored as real names
// (root + quality), never collapsed to scale degrees — so 7ths, sus, and
// borrowed/non-diatonic chords survive intact. The key only drives the
// convenience palette, not what a chord can be.

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS: Record<string, number> = { Db: 1, Eb: 3, Gb: 6, Ab: 8, Bb: 10, Cb: 11, Fb: 4 };
const SHARPS: Record<string, number> = { "C#": 1, "D#": 3, "F#": 6, "G#": 8, "A#": 10, "E#": 5, "B#": 0 };
const NATURALS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function pitchClassOf(root: string): number | null {
  if (root in SHARPS) return SHARPS[root];
  if (root in FLATS) return FLATS[root];
  if (root in NATURALS) return NATURALS[root];
  return null;
}

// quality suffix -> semitone intervals from the root
const QUALITIES: Array<[RegExp, number[], string]> = [
  [/^(maj7|M7|Δ7?)/, [0, 4, 7, 11], "maj7"],
  [/^(m7b5|ø|min7b5|m7♭5)/, [0, 3, 6, 10], "m7b5"],
  [/^(m7|min7|-7)/, [0, 3, 7, 10], "m7"],
  [/^(dim7|°7)/, [0, 3, 6, 9], "dim7"],
  [/^(7sus4|7sus)/, [0, 5, 7, 10], "7sus4"],
  [/^9/, [0, 4, 7, 10, 14], "9"],
  [/^7/, [0, 4, 7, 10], "7"],
  [/^(m6|min6)/, [0, 3, 7, 9], "m6"],
  [/^6/, [0, 4, 7, 9], "6"],
  [/^(sus2)/, [0, 2, 7], "sus2"],
  [/^(sus4|sus)/, [0, 5, 7], "sus4"],
  [/^(add9)/, [0, 4, 7, 14], "add9"],
  [/^(dim|°|o)/, [0, 3, 6], "dim"],
  [/^(aug|\+)/, [0, 4, 8], "aug"],
  [/^(m|min|-)/, [0, 3, 7], "m"],
  [/^(maj|M)?/, [0, 4, 7], ""], // default: major triad
];

export type ParsedChord = {
  name: string;
  root: string;
  rootPc: number;
  quality: string;
  /** pitch classes (0-11) of the chord tones */
  pcs: number[];
  bassPc: number | null;
};

/** Parse a chord name like "Am", "Fmaj7", "G7", "Csus4", "Bm7b5", "D/F#". */
export function parseChord(raw: string): ParsedChord | null {
  const name = raw.trim();
  if (!name) return null;
  const m = name.match(/^([A-Ga-g])([#b♯♭]?)(.*)$/);
  if (!m) return null;
  const root = (m[1].toUpperCase() + (m[2] || "")).replace("♯", "#").replace("♭", "b");
  const rootPc = pitchClassOf(root);
  if (rootPc == null) return null;

  let rest = m[3];
  let bassPc: number | null = null;
  const slash = rest.split("/");
  if (slash.length === 2) {
    rest = slash[0];
    bassPc = pitchClassOf(slash[1].replace("♯", "#").replace("♭", "b").replace(/^([a-g])/, (c) => c.toUpperCase()));
  }
  for (const [re, intervals, _q] of QUALITIES) {
    if (re.test(rest)) {
      const pcs = intervals.map((iv) => (rootPc + iv) % 12);
      return { name, root, rootPc, quality: _q, pcs, bassPc };
    }
  }
  return { name, root, rootPc, quality: "", pcs: [0, 4, 7].map((iv) => (rootPc + iv) % 12), bassPc };
}

/** Voice a parsed chord as MIDI notes around a base octave (for playback). */
export function chordMidi(c: ParsedChord, base = 48): number[] {
  const notes: number[] = [];
  if (c.bassPc != null) notes.push(base - 12 + c.bassPc);
  let prev = -1;
  for (const pc of c.pcs) {
    let n = base + pc;
    while (n <= prev) n += 12; // keep ascending so voicing sounds tidy
    notes.push(n);
    prev = n;
  }
  return notes;
}

/** The 7 diatonic triads of a key, as chord names — for the palette quick-add. */
export function diatonicChords(rootPc: number, mode: "major" | "minor"): { roman: string; name: string }[] {
  const majSteps = [0, 2, 4, 5, 7, 9, 11];
  const minSteps = [0, 2, 3, 5, 7, 8, 10];
  const majQual = ["", "m", "m", "", "", "m", "dim"];
  const minQual = ["m", "dim", "", "m", "m", "", ""];
  const majRoman = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
  const minRoman = ["i", "ii°", "III", "iv", "v", "VI", "VII"];
  const steps = mode === "major" ? majSteps : minSteps;
  const quals = mode === "major" ? majQual : minQual;
  const romans = mode === "major" ? majRoman : minRoman;
  return steps.map((st, i) => ({ roman: romans[i], name: NOTE_NAMES[(rootPc + st) % 12] + quals[i] }));
}
