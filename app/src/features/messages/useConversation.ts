import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "./errors";
import { checkMessage } from "./format";
import { getConversation, listMessages, sendMessage } from "./sampleMessages";
import type { Conversation, Message } from "./types";

type Status = "loading" | "ready" | "error";

/** Where a conversation's data comes from: the sample store for now, the API once it exists. */
export type ConversationApi = {
  get: (conversationId: number) => Promise<Conversation>;
  list: (conversationId: number) => Promise<Message[]>;
  send: (conversationId: number, text: string) => Promise<Message>;
};

const SAMPLE_API: ConversationApi = { get: getConversation, list: listMessages, send: sendMessage };

/**
 * Loads one conversation and its messages, and sends new ones. The screen calls `load` when it opens
 * and each time it comes back into view. Messages already on screen stay there while it reloads.
 *
 * @param conversationId - From the page's address. A bad link gives NaN, which loads as not found.
 * @param api - Where to load from and send to. Tests pass their own.
 */
export function useConversation(conversationId: number, api: ConversationApi = SAMPLE_API) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const latest = useRef(0);
  const mounted = useRef(true);
  const sendingNow = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const request = ++latest.current;
    const current = () => mounted.current && request === latest.current;
    try {
      const [loadedConversation, loadedMessages] = await Promise.all([
        api.get(conversationId),
        api.list(conversationId),
      ]);
      if (!current()) return;
      setConversation(loadedConversation);
      setMessages(loadedMessages);
      setErrorMessage(null);
      setStatus("ready");
    } catch (error) {
      if (!current()) return;
      setErrorMessage(errorText(error, "Something went wrong loading this conversation."));
      setStatus("error");
    }
  }, [api, conversationId]);

  /**
   * Checks a message and sends it. A second tap while one is sending is ignored.
   *
   * @returns True once it's sent, so the screen can clear the text box. False with `sendError` set if
   *   the message was refused or didn't send.
   */
  const send = useCallback(
    async (draft: string): Promise<boolean> => {
      if (sendingNow.current) return false;
      const check = checkMessage(draft);
      if (!check.ok) {
        setSendError(check.message);
        return false;
      }
      sendingNow.current = true;
      setSending(true);
      setSendError(null);
      try {
        const sent = await api.send(conversationId, check.text);
        if (mounted.current) setMessages((current) => [...current, sent]);
        return true;
      } catch (error) {
        if (mounted.current) setSendError(errorText(error, "Your message didn't send. Try again."));
        return false;
      } finally {
        sendingNow.current = false;
        if (mounted.current) setSending(false);
      }
    },
    [api, conversationId],
  );

  const clearSendError = useCallback(() => setSendError(null), []);

  return { conversation, messages, status, errorMessage, load, send, sending, sendError, clearSendError };
}
