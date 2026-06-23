import { useEffect } from "react";
import { useFieldDrawer } from "./FieldDrawer";

/** The per-field trigger — opens (and keeps in sync) the right-hand field drawer
 *  focused on this field. Same props as before, so editors don't change. */
export function FieldChat({
  stageLabel, fieldLabel, current, onResult,
}: {
  stageLabel: string; fieldLabel: string; current: string; onResult: (value: string) => void;
}) {
  const d = useFieldDrawer();
  const id = `${stageLabel}::${fieldLabel}`;
  const isActive = d?.active?.id === id;
  // keep the drawer's reference to this field's value/setter fresh while it's focused
  useEffect(() => {
    if (isActive) d?.sync({ id, stageLabel, fieldLabel, value: current, onChange: onResult });
  }, [current, isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button type="button" className={"sm ghost" + (isActive ? " primary" : "")} title={`open “${fieldLabel}” in the field panel`}
      onClick={() => d?.open({ id, stageLabel, fieldLabel, value: current, onChange: onResult })}>💬</button>
  );
}
