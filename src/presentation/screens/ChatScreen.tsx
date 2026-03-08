import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";

import { buildChatWsUrl, withAuthToken } from "../../api/websocketUrls";
import {
  normalizeMessage,
  type ChatMessage,
  type ChatMessageApi,
  type ChatMessagesResponse,
} from "../../api/chatMessages";
import { getChat } from "../../api/chats";
import { colors } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";

type ChatScreenParams = {
  handshakeId: string;
  otherUserName: string;
  serviceTitle?: string;
};

type NavProps = NativeStackScreenProps<{ Chat: ChatScreenParams }, "Chat">;

type ChatMessageWithMeta = ChatMessage & {
  sender?: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar_url?: string;
  handshake_id?: string;
  pending?: boolean;
};

export default function ChatScreen() {
  const { params } = useRoute<NavProps["route"]>();
  const navigation = useNavigation<NavProps["navigation"]>();
  const { user } = useAuth();

  const { handshakeId, otherUserName, serviceTitle } = params ?? {
    handshakeId: "",
    otherUserName: "Chat",
    serviceTitle: undefined,
  };

  const [messages, setMessages] = useState<ChatMessageWithMeta[]>([]);
  const [inputText, setInputText] = useState("");
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList<ChatMessageWithMeta>>(null);
  const currentUserIdRef = useRef<string | undefined>(undefined);
  const currentUserEmailRef = useRef<string | undefined>(undefined);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedAtRef = useRef<number>(0);
  const connectRef = useRef<(() => void) | null>(null);

  const currentUserId = user?.id;
  const currentUserEmail = user?.email;

  currentUserIdRef.current = currentUserId;
  currentUserEmailRef.current = currentUserEmail;

  const title = useMemo(() => otherUserName || "Messages", [otherUserName]);
  const subtitle = useMemo(() => serviceTitle ?? undefined, [serviceTitle]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const normalizeIncomingMessage = useCallback(
    (raw: Record<string, unknown>): ChatMessageWithMeta => {
      return normalizeMessage(raw) as ChatMessageWithMeta;
    },
    [],
  );

  const dedupeMessages = useCallback((items: ChatMessageWithMeta[]) => {
    const map = new Map<string, ChatMessageWithMeta>();

    for (const item of items) {
      map.set(item.id, item);
    }

    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
  }, []);

  const sameLogicalMessage = useCallback(
    (a: ChatMessageWithMeta, b: ChatMessageWithMeta) => {
      const aText = (a.body ?? a.content ?? "").trim();
      const bText = (b.body ?? b.content ?? "").trim();

      const sameSender =
        (!!a.sender_id && !!b.sender_id && a.sender_id === b.sender_id) ||
        (!!a.sender && !!b.sender && a.sender === b.sender);

      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

      return sameSender && aText === bText && Math.abs(aTime - bTime) < 15000;
    },
    [],
  );

  const mergeIncomingMessage = useCallback(
    (prev: ChatMessageWithMeta[], incoming: ChatMessageWithMeta) => {
      const next = [...prev];

      const pendingIndex = next.findIndex(
        (m) => m.pending && sameLogicalMessage(m, incoming),
      );

      if (pendingIndex !== -1) {
        next[pendingIndex] = {
          ...incoming,
          pending: false,
        };
        return dedupeMessages(next);
      }

      return dedupeMessages([...next, incoming]);
    },
    [dedupeMessages, sameLogicalMessage],
  );

  const loadMessages = useCallback(async () => {
    if (!handshakeId) return;

    try {
      setLoading(true);
      setError(null);

      const data = (await getChat(handshakeId)) as unknown;
      const results = Array.isArray((data as { results?: unknown[] }).results)
        ? (data as ChatMessagesResponse).results
        : [];

      const normalized = results.map(
        (m: ChatMessageApi | Record<string, unknown>) =>
          normalizeIncomingMessage(m as Record<string, unknown>),
      );

      setMessages(dedupeMessages(normalized));
      scrollToBottom(false);
    } catch (e) {
      console.error("Failed to load messages:", e);
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [dedupeMessages, handshakeId, normalizeIncomingMessage, scrollToBottom]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: title,
      headerBackTitle: "Back",
    });
  }, [navigation, title]);

  useEffect(() => {
    if (!handshakeId) return;

    const PING_INTERVAL_MS = 25000;

    const clearPingPongTimers = () => {
      if (pingIntervalRef.current !== null) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const url = withAuthToken(buildChatWsUrl(handshakeId));
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        openedAtRef.current = Date.now();
        setConnected(true);
        setError(null);
        setReconnectAttempts(0);
        loadMessages();

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          try {
            ws.send(JSON.stringify({ type: "ping" }));
          } catch (e) {
            console.error("Ping send failed:", e);
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          if (data?.type === "pong") {
            return;
          }

          if (data?.type === "ping") {
            try {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "pong" }));
              }
            } catch (e) {
              console.error("Pong send failed:", e);
            }
            return;
          }

          if (data?.type === "chat_message" && data.message != null) {
            const payload = data.message;
            const raw =
              typeof payload === "object" && payload !== null
                ? payload
                : {
                    id: `msg-${Date.now()}`,
                    body: String(payload),
                    created_at: new Date().toISOString(),
                  };
            const normalized = normalizeIncomingMessage(
              raw as Record<string, unknown>,
            );
            setMessages((prev) => mergeIncomingMessage(prev, normalized));
            scrollToBottom();
            return;
          }

          if (data?.type === "notification" && data.message != null) {
            const payload = data.message;
            const raw =
              typeof payload === "object" && payload !== null
                ? payload
                : {
                    id: `notif-${Date.now()}`,
                    body: String(payload),
                    created_at: new Date().toISOString(),
                  };
            const normalized = normalizeIncomingMessage(
              raw as Record<string, unknown>,
            );
            setMessages((prev) => mergeIncomingMessage(prev, normalized));
            scrollToBottom();
            return;
          }

          if (Array.isArray(data)) {
            const incoming = data.map((m: Record<string, unknown>) =>
              normalizeIncomingMessage(m),
            );

            setMessages((prev) => {
              let next = prev;
              for (const msg of incoming) {
                next = mergeIncomingMessage(next, msg);
              }
              return next;
            });

            scrollToBottom();
            return;
          }

          if (
            data.type === "message" ||
            data.body !== undefined ||
            data.content !== undefined
          ) {
            const normalized = normalizeIncomingMessage(data);
            setMessages((prev) => mergeIncomingMessage(prev, normalized));
            scrollToBottom();
            return;
          }

          if (data.messages && Array.isArray(data.messages)) {
            const normalized = data.messages.map((m: Record<string, unknown>) =>
              normalizeIncomingMessage(m),
            );

            setMessages((prev) => {
              let next = prev;
              for (const msg of normalized) {
                next = mergeIncomingMessage(next, msg);
              }
              return next;
            });

            scrollToBottom();
          }
        } catch (e) {
          console.error("ws.onmessage parse error:", e, event.data);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        setError("Connection error");
      };

      ws.onclose = (event: { code: number }) => {
        clearPingPongTimers();
        setConnected(false);
        wsRef.current = null;

        const isPermanentRejection = event.code >= 4000;
        if (event.code === 1000 || isPermanentRejection) return;

        const openDuration = Date.now() - openedAtRef.current;
        setReconnectAttempts((prev) => {
          if (prev >= 5) return prev;
          const delay =
            openDuration < 2000
              ? 8000
              : Math.min(1000 * Math.pow(2, prev), 30_000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectRef.current?.();
          }, delay);
          return prev + 1;
        });
      };
    };

    connectRef.current = connect;
    connect();

    return () => {
      clearReconnectTimeout();
      clearPingPongTimers();
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [
    handshakeId,
    loadMessages,
    mergeIncomingMessage,
    normalizeIncomingMessage,
    scrollToBottom,
  ]);

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Socket is not connected.");
      return;
    }

    const now = new Date().toISOString();
    const pendingId = `pending-${Date.now()}`;

    const displayName = user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
        user.email ||
        "You"
      : "You";

    const optimistic: ChatMessageWithMeta = {
      id: pendingId,
      body: text,
      content: text,
      created_at: now,
      sender_id: currentUserId,
      sender: currentUserEmail,
      sender_name: displayName,
      handshake_id: handshakeId,
      pending: true,
    };

    setMessages((prev) => dedupeMessages([...prev, optimistic]));
    setInputText("");
    scrollToBottom();

    try {
      ws.send(
        JSON.stringify({ type: "chat_message", body: text }),
      );
    } catch (e) {
      console.error("Send failed:", e);
      setError("Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== pendingId));
    }
  }, [
    inputText,
    user,
    currentUserId,
    currentUserEmail,
    handshakeId,
    dedupeMessages,
    scrollToBottom,
  ]);

  const formatTime = useCallback((value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const isOwnMessage = useCallback(
    (item: ChatMessageWithMeta) => {
      if (currentUserId && item.sender_id) {
        return currentUserId === item.sender_id;
      }

      if (currentUserEmail && item.sender) {
        return currentUserEmail === item.sender;
      }

      return false;
    },
    [currentUserEmail, currentUserId],
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessageWithMeta; index: number }) => {
      const own = isOwnMessage(item);

      const previous = messages[index - 1];
      const showAvatar =
        !own && (!previous || previous.sender_id !== item.sender_id);

      const senderName = item.sender_name ?? otherUserName;
      const avatarUrl = item.sender_avatar_url;

      return (
        <View
          style={[
            styles.messageRow,
            own ? styles.ownMessageRow : styles.otherMessageRow,
          ]}
        >
          {!own ? (
            <View style={styles.avatarSlot}>
              {showAvatar ? (
                avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>
                      {senderName?.charAt(0)?.toUpperCase() ?? "U"}
                    </Text>
                  </View>
                )
              ) : null}
            </View>
          ) : null}

          <View
            style={[
              styles.bubbleWrap,
              own ? styles.ownBubbleWrap : styles.otherBubbleWrap,
            ]}
          >
            {!own && showAvatar ? (
              <Text style={styles.senderName}>{senderName}</Text>
            ) : null}

            <View
              style={[
                styles.messageBubble,
                own ? styles.ownBubble : styles.otherBubble,
                item.pending && styles.pendingBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  own ? styles.ownMessageText : styles.otherMessageText,
                ]}
              >
                {item.body || item.content || ""}
              </Text>

              <View style={styles.messageFooter}>
                {item.pending ? (
                  <Text
                    style={[
                      styles.pendingText,
                      own ? styles.ownMessageTime : styles.otherMessageTime,
                    ]}
                  >
                    Sending...
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.messageTime,
                    own ? styles.ownMessageTime : styles.otherMessageTime,
                  ]}
                >
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [formatTime, isOwnMessage, messages, otherUserName],
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.topMeta}>
          <View style={styles.topMetaTextWrap}>
            <Text style={styles.topMetaTitle}>{otherUserName}</Text>
            {!!subtitle ? (
              <Text style={styles.topMetaSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.statusWrap}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: connected ? colors.GREEN : colors.GRAY400 },
              ]}
            />
            <Text style={styles.statusText}>
              {connected ? "Connected" : "Connecting"}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadMessages}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.BLUE} />
            <Text style={styles.centerStateText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              messages.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollToBottom(false)}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={34}
                  color={colors.GRAY400}
                />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.centerStateText}>
                  Start the conversation by sending a message.
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder={connected ? "Type a message..." : "Connecting..."}
              placeholderTextColor={colors.GRAY400}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              editable={connected}
              multiline
              maxLength={1000}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!connected || !inputText.trim()) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!connected || !inputText.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color={colors.WHITE} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.WHITE,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topMeta: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.GRAY200,
    backgroundColor: colors.WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topMetaTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  topMetaTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.GRAY900 ?? "#111827",
  },
  topMetaSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.GRAY500,
  },
  statusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    color: colors.GRAY500,
  },
  errorBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    marginRight: 12,
  },
  retryText: {
    color: colors.BLUE,
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  centerStateText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.GRAY500,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: colors.GRAY900 ?? "#111827",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-end",
  },
  ownMessageRow: {
    justifyContent: "flex-end",
  },
  otherMessageRow: {
    justifyContent: "flex-start",
  },
  avatarSlot: {
    width: 36,
    marginRight: 8,
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.GRAY200,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.GRAY300 ?? "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.GRAY700 ?? "#374151",
  },
  bubbleWrap: {
    maxWidth: "82%",
  },
  ownBubbleWrap: {
    alignItems: "flex-end",
  },
  otherBubbleWrap: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    color: colors.GRAY500,
    marginBottom: 4,
    marginLeft: 2,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: colors.GREEN,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: colors.WHITE,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.GRAY200,
  },
  pendingBubble: {
    opacity: 0.8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownMessageText: {
    color: colors.WHITE,
  },
  otherMessageText: {
    color: colors.GRAY900 ?? "#111827",
  },
  messageFooter: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  pendingText: {
    fontSize: 11,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: "rgba(255,255,255,0.8)",
  },
  otherMessageTime: {
    color: colors.GRAY400,
  },
  inputRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 16 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.GRAY200,
    backgroundColor: colors.WHITE,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  input: {
    fontSize: 15,
    color: colors.GRAY900 ?? "#111827",
    paddingVertical: 11,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: colors.GRAY400,
  },
});
