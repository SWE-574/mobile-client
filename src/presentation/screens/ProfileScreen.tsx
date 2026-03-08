import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../api/auth";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export default function ProfileScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, "ProfileHome">>();

  if (!user) {
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <Text style={styles.header}>Profile</Text>
        <Text style={styles.subheader}>
          Sign in to see your profile and track your exchanges
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.buttonText}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.buttonSecondaryText}>Create account</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      <Text style={styles.name}>
        {user.first_name} {user.last_name}
      </Text>
      {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      {user.email ? <Text style={styles.email}>{user.email}</Text> : null}
      <TouchableOpacity style={styles.buttonSecondary} onPress={() => logout()}>
        <Text style={styles.buttonSecondaryText}>Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  buttonSecondaryText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "600",
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
    color: "#444",
    marginBottom: 8,
  },
  email: {
    fontSize: 15,
    color: "#666",
  },
});
