import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import type { Service } from "../../api/types";
import { formatTimeAgo } from "../utils/formatTimeAgo";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const HEADER_PALETTE = ["#6a48d8", "#2e4bf0", "#e53935", "#2e7d32", "#f9a825"];

function headerColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash << 5) - hash + id.charCodeAt(i);
  return HEADER_PALETTE[Math.abs(hash) % HEADER_PALETTE.length];
}

function getInitials(firstName: string, lastName: string): string {
  const f = (firstName || "").trim().charAt(0) || "";
  const l = (lastName || "").trim().charAt(0) || "";
  return (f + l).toUpperCase() || "?";
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    height: 100,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  headerOverlay: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    top: -24,
    left: -20,
  },
  headerOverlayRight: {
    left: undefined,
    right: -24,
    top: -20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  body: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  typeBadge: {
    position: "absolute",
    right: 0,
    top: 0,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  typeOffer: {
    backgroundColor: "#81c784",
  },
  typeWant: {
    backgroundColor: "#64b5f6",
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#388e3c",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  userMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginRight: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: "#757575",
  },
  description: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#eeeeee",
    marginRight: 6,
    marginBottom: 6,
  },
  tagRecurring: {
    backgroundColor: "#e1bee7",
  },
  tagText: {
    fontSize: 12,
    color: "#616161",
    marginLeft: 4,
  },
  tagTextRecurring: {
    color: "#6a1b9a",
  },
  hashtagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  hashtag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
    marginRight: 6,
    marginBottom: 4,
  },
  hashtagText: {
    fontSize: 12,
    color: "#424242",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  participantCount: {
    fontSize: 12,
    color: "#9e9e9e",
    marginLeft: 4,
  },
});

export interface ServiceCardProps {
  service: Service;
  style?: ViewStyle;
}

export default function ServiceCard({ service, style }: ServiceCardProps) {
  const headerColor = headerColorFor(service.id);
  const isOffer = service.type === "Offer";
  const initials = getInitials(service.user.first_name, service.user.last_name);
  const displayName =
    [service.user.first_name, service.user.last_name]
      .filter(Boolean)
      .join(" ") || "Unknown";
  const isRecurring = service.schedule_type === "Recurrent";

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.header, { backgroundColor: headerColor }]}>
        <View style={styles.headerOverlay} />
        <View style={[styles.headerOverlay, styles.headerOverlayRight]} />
        <Text style={styles.headerTitle} numberOfLines={2}>
          {service.title}
        </Text>
      </View>

      <View style={styles.body}>
        <View
          style={[
            styles.typeBadge,
            isOffer ? styles.typeOffer : styles.typeWant,
          ]}
        >
          <Text style={styles.typeBadgeText}>{isOffer ? "Offer" : "Want"}</Text>
        </View>

        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.timeAgo}>
              • {formatTimeAgo(service.created_at)}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {service.description || "—"}
        </Text>

        <View style={styles.tagsRow}>
          {service.duration ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>🕐 {service.duration}</Text>
            </View>
          ) : null}
          {(service.location_area || service.location_type) && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                📍 {service.location_area || service.location_type}
              </Text>
            </View>
          )}
          {service.schedule_details && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>📅 {service.schedule_details}</Text>
            </View>
          )}
          {isRecurring && (
            <View style={[styles.tag, styles.tagRecurring]}>
              <Text style={[styles.tagText, styles.tagTextRecurring]}>
                🔄 Recurring
              </Text>
            </View>
          )}
        </View>

        {service.tags?.length > 0 && (
          <View style={styles.hashtagsRow}>
            {service.tags.slice(0, 5).map((tag) => (
              <View key={tag.id} style={styles.hashtag}>
                <Text style={styles.hashtagText}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.participantCount}>
            {service.max_participants}
          </Text>
        </View>
      </View>
    </View>
  );
}
