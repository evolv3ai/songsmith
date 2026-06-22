// Minimal Web Audio synth — plays absolute chords so you can hear a progression.
// Preview only (not full-song audio generation). Voiced from real chord tones.

let ctx: AudioContext | null = null;
function audio(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Play a chord (MIDI notes) for `dur` seconds starting at audio-time `at`. */
export function playChordAt(notes: number[], at: number, dur: number) {
  const ac = audio();
  const master = ac.createGain();
  master.gain.value = 0.0001;
  master.connect(ac.destination);
  master.gain.setValueAtTime(0.0001, at);
  master.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  for (const n of notes) {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = midiToHz(n);
    osc.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

export function playChord(notes: number[], dur = 1.0) {
  const ac = audio();
  if (ac.state === "suspended") ac.resume();
  playChordAt(notes, ac.currentTime + 0.02, dur);
}

export type Step = { notes: number[]; beats: number };

/** Play a sequence of chords at `bpm`. Calls `onStep(index)` as each plays.
 *  Returns a stop() handle. */
export function playSequence(steps: Step[], bpm: number, onStep?: (i: number) => void): () => void {
  const ac = audio();
  if (ac.state === "suspended") ac.resume();
  const secPerBeat = 60 / bpm;
  let t = ac.currentTime + 0.06;
  const timers: number[] = [];
  steps.forEach((s, i) => {
    const dur = s.beats * secPerBeat;
    playChordAt(s.notes, t, dur * 0.95);
    const fireAt = (t - ac.currentTime) * 1000;
    timers.push(window.setTimeout(() => onStep?.(i), fireAt));
    t += dur;
  });
  timers.push(window.setTimeout(() => onStep?.(-1), (t - ac.currentTime) * 1000));
  return () => timers.forEach(clearTimeout);
}
