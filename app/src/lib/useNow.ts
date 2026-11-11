import { useEffect, useState } from "react";

const REFRESH_MS = 60_000;

/** The current time, updated each minute, so pin colors stay right on a screen that's left open. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return now;
}
