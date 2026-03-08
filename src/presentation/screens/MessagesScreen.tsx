import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Chat, listChats } from "../../api/chats";
import type { MessagesStackParamList } from "../../navigation/MessagesStack";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../constants/colors";
import type { BottomTabParamList } from "../../navigation/BottomTabNavigator";

type Nav = NativeStackNavigationProp<MessagesStackParamList, "MessagesList">;

export default function MessagesScreen() {
  const navigation = useNavigation<Nav>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const user = useAuth();

  useEffect(() => {
    if (!user.user) return;
    (async () => {
      try {
        const data = await listChats();
        setChats(data);
      } catch (err) {
        console.error("Failed to load chats:", err);
        setError("Failed to load messages.");
        setChats([]);
      }
    })();
  }, [user.user]);

  const openChat = (item: Chat) => {
    navigation.navigate("Chat", {
      handshakeId: item.handshake_id,
      otherUserName: item.other_user?.name ?? "Unknown",
      serviceTitle: item.service_title,
    });
  };

  const renderItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.itemTitle}>
        {item?.other_user?.name ?? "Unknown"}
      </Text>
      <Text style={styles.itemBody}>
        {item?.last_message?.body ?? "No messages yet"}
      </Text>
      {item?.last_message?.created_at ? (
        <Text style={styles.itemTime}>
          {new Date(item.last_message.created_at).toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
          )}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {!user.user ? (
        <View style={styles.container}>
          <Text>You are not logged in</Text>
          <Text style={styles.subheader}>
            <Text
              style={styles.link}
              onPress={() => {
                const tabNav = navigation.getParent() as
                  | import("@react-navigation/native").NavigationProp<BottomTabParamList>
                  | undefined;
                tabNav?.navigate("Profile", { screen: "Login" });
              }}
            >
              Sign in
            </Text>{" "}
            to see your messages
          </Text>
        </View>
      ) : error ? (
        <View style={styles.item}>
          <Text style={styles.itemBody}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderItem}
          keyExtractor={(item) => item.handshake_id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            !error && chats.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No conversations yet</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: 1,
    backgroundColor: "#ccc",
  },
  link: {
    color: colors.BLUE,
    fontSize: 15,
    textDecorationLine: "underline",
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subheader: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  itemBody: {
    fontSize: 14,
    color: "#666",
  },
  itemTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
});
