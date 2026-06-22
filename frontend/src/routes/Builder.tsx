import { ChordBuilder } from "../components/ChordBuilder";

export function Builder() {
  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Chord builder</h1>
          <span className="muted">Stub progressions with the wheel + voicings, save to your library, export a chart to play from.</span>
        </div>
      </div>
      <ChordBuilder />
    </div>
  );
}
