// Full fretboard view — renders the guitar neck (6 strings × 15 frets) and
// highlights a voicing's fingering. `frets[s]` is the fret on string s
// (0 = open, -1 = muted), string 0 = low E. Strings draw low-E at the bottom.

const STR_LABEL = ["E", "A", "D", "G", "B", "e"]; // string 0..5 (low→high)
const FRETS = 12;
const MARKERS = [3, 5, 7, 9]; // single dots
const NUT_X = 34, FRET_W = 36, STR_GAP = 20, TOP = 14;

export function GuitarView({ frets }: { frets: number[] }) {
  const W = NUT_X + FRETS * FRET_W + 14;
  const H = TOP + 5 * STR_GAP + 26;
  const yOf = (s: number) => TOP + (5 - s) * STR_GAP; // string 0 (low E) at bottom
  const xOf = (fret: number) => NUT_X + (fret - 0.5) * FRET_W; // center of a fret

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%" }}>
      {/* fret-marker inlays */}
      {MARKERS.map((f) => (<circle key={f} cx={xOf(f)} cy={TOP + 2.5 * STR_GAP} r={3} fill="var(--line)" />))}
      <circle cx={xOf(12) - 6} cy={TOP + 2.5 * STR_GAP} r={3} fill="var(--line)" />
      <circle cx={xOf(12) + 6} cy={TOP + 2.5 * STR_GAP} r={3} fill="var(--line)" />

      {/* strings + labels */}
      {STR_LABEL.map((lbl, s) => (
        <g key={s}>
          <text x={12} y={yOf(s) + 4} fontSize={10} fontFamily="monospace" fill="var(--ink-dim)" textAnchor="middle">{lbl}</text>
          <line x1={NUT_X} y1={yOf(s)} x2={NUT_X + FRETS * FRET_W} y2={yOf(s)} stroke="var(--line)" />
        </g>
      ))}
      {/* nut + frets */}
      <line x1={NUT_X} y1={yOf(5)} x2={NUT_X} y2={yOf(0)} stroke="var(--ink)" strokeWidth={3} />
      {Array.from({ length: FRETS }, (_, i) => i + 1).map((f) => (
        <g key={f}>
          <line x1={NUT_X + f * FRET_W} y1={yOf(5)} x2={NUT_X + f * FRET_W} y2={yOf(0)} stroke="var(--line)" />
          <text x={NUT_X + (f - 0.5) * FRET_W} y={H - 8} fontSize={9} fontFamily="monospace" fill="var(--ink-faint)" textAnchor="middle">{f}</text>
        </g>
      ))}

      {/* fingering */}
      {frets.map((f, s) => {
        const y = yOf(s);
        if (f === -1) return <text key={s} x={NUT_X - 18} y={y + 4} fontSize={11} fontFamily="monospace" fill="var(--ink-faint)" textAnchor="middle">×</text>;
        if (f === 0) return <circle key={s} cx={NUT_X - 16} cy={y} r={5} fill="none" stroke="var(--ink)" />;
        return <circle key={s} cx={xOf(f)} cy={y} r={7} fill="var(--accent)" />;
      })}
    </svg>
  );
}
