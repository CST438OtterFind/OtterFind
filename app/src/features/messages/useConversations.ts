import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "./errors";
import { listConversations } from "./sampleMessages";
import type { Conversation } from "./types";

type Status = "loading" | "ready" | "error";

/**
 * Loads the inbox. The screen calls `load` when it opens and each time it comes back into view, and
 * `refresh` for pull-to-refresh. Conversations already on screen stay there while either runs, and
 * only the newest request's result is kept.
 *
 * @param list - How to fetch the conversations. Tests pass their own.
 */
export function useConversations(list: () => Promise<Conversation[]> = listConversations) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (asRefresh: boolean) => {
      const request = ++latest.current;
      const current = () => mounted.current && request === latest.current;
      if (asRefresh) setRefreshing(true);
      try {
        const loaded = await list();
        if (!current()) return;
        setConversations(loaded);
        setErrorMessage(null);
        setStatus("ready");
      } catch (error) {
        if (!current()) return;
        setErrorMessage(errorText(error, "Something went wrong loading your messages."));
        setStatus("error");
      } finally {
        if (current()) setRefreshing(false);
      }
    },
    [list],
  );

  const load = useCallback(() => run(false), [run]);
  const refresh = useCallback(() => run(true), [run]);

  return { conversations, status, errorMessage, refreshing, load, refresh };
}
