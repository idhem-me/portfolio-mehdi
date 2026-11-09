"use client";

import { useEffect, useRef, useState } from "react";
import { slugify } from "@/features/color-generator/engine/color-generator";

export function usePaletteActions(svg: string, name: string) {
  const [feedback, setFeedback] = useState<Record<string, "copied" | "error">>(
    {},
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);
  async function copy(value: string, id: string) {
    let result: "copied" | "error";
    try {
      await navigator.clipboard.writeText(value);
      result = "copied";
    } catch {
      result = "error";
    }
    clearTimeout(timers.current.get(id));
    setFeedback((previous) => ({ ...previous, [id]: result }));
    timers.current.set(
      id,
      setTimeout(
        () => {
          setFeedback((previous) => {
            const next = { ...previous };
            delete next[id];
            return next;
          });
          timers.current.delete(id);
        },
        result === "copied" ? 2000 : 5000,
      ),
    );
  }
  function download() {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(name)}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { copy, feedback, download };
}
