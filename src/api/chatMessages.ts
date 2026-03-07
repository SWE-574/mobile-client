/**
 * Shared types for chat messages (1:1, group, public).
 * WebSocket payloads may use body or content; we normalize for display.
 */

export interface ChatMessage {
  id: string;
  sender_id?: string;
  sender_name?: string;
  body?: string;
  content?: string;
  created_at: string;
  type?: string;
  [key: string]: unknown;
}

export function normalizeMessage(raw: Record<string, unknown>): ChatMessage {
  const id =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.id === "number"
        ? String(raw.id)
        : "";
  const body =
    typeof raw.body === "string"
      ? raw.body
      : typeof raw.content === "string"
        ? raw.content
        : "";
  const created_at =
    typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString();
  const author = raw.author;
  const sender_name =
    typeof raw.sender_name === "string"
      ? raw.sender_name
      : author && typeof author === "object" && "username" in author
        ? String((author as { username: string }).username)
        : typeof author === "string"
          ? author
          : undefined;
  return {
    id,
    sender_id: raw.sender_id as string | undefined,
    sender_name,
    body,
    content: body,
    created_at,
    type: raw.type as string | undefined,
    ...raw,
  };
}
