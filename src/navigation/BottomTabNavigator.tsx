import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../presentation/screens/HomeScreen";
import ExploreScreen from "../presentation/screens/ExploreScreen";
import ProfileScreen from "../presentation/screens/ProfileScreen";

export type BottomTabParamList = {
  Home: undefined;
  Explore: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#999",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home", tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: "Explore", tabBarLabel: "Explore" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
