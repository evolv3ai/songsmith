import { STAGE_LABELS } from "../ipc/api";
import type { Stage } from "../ipc/generated";

export function StageChecklist({
  stages,
  currentType,
  selectedId,
  onSelect,
}: {
  stages: Stage[];
  currentType: string;
  selectedId: string | null;
  onSelect: (s: Stage) => void;
}) {
  return (
    <div className="pane checklist">
      <h3>Song spec</h3>
      {stages.map((s) => {
        const active = selectedId ? s.id === selectedId : s.type === currentType;
        return (
          <div key={s.id} className={"step" + (active ? " active" : "")} onClick={() => onSelect(s)}>
            <span className="ord">{Number(s.ordinal) + 1}</span>
            <span className={"dot " + s.status} />
            <span className="label">{STAGE_LABELS[s.type] ?? s.type}</span>
            {s.status === "done" && <span className="faint">✓</span>}
          </div>
        );
      })}
    </div>
  );
}
