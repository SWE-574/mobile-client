import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chat, listChats } from "../../api/chats";

export default function MessagesScreen() {
  const [messages, setMessages] = useState<Chat[]>([]);

  useEffect(() => {
    listChats().then((data) => {
      console.log("listChats response:", data);
      setMessages(data);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={messages}
        renderItem={({ item }) => {
          console.log("item:", item);
          return (
            <TouchableOpacity style={styles.item}>
              <Text style={styles.itemTitle}>{item?.other_user?.name}</Text>
              <Text style={styles.itemBody}>{item?.last_message?.body}</Text>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.handshake_id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  separator: {
    height: 1,
    backgroundColor: "#ccc",
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  itemBody: {
    fontSize: 14,
    color: "#666",
  },
});
