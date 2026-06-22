// Small note-name + key/scale helpers. Chord parsing and voicings come from the
// ported music-kb engine (lib/music) via engineAdapter; this file only holds the
// pitch-class names and the diatonic-palette convenience used by the Composer.

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const FLATS: Record<string, number> = { Db: 1, Eb: 3, Gb: 6, Ab: 8, Bb: 10, Cb: 11, Fb: 4 };
const SHARPS: Record<string, number> = { "C#": 1, "D#": 3, "F#": 6, "G#": 8, "A#": 10, "E#": 5, "B#": 0 };
const NATURALS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Pitch class (0–11) of a note name like "A", "F#", "Bb". */
export function pitchClassOf(root: string): number | null {
  if (root in SHARPS) return SHARPS[root];
  if (root in FLATS) return FLATS[root];
  if (root in NATURALS) return NATURALS[root];
  return null;
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
