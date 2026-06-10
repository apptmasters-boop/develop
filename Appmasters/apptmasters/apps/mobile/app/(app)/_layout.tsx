import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focused: boolean) {
  return <Ionicons name={focused ? name : `${name}-outline` as IconName} size={24} color={focused ? Colors.primary : Colors.textMuted} />;
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: ({ focused }) => icon("home", focused) }}
      />
      <Tabs.Screen
        name="chores"
        options={{ title: "Chores", tabBarIcon: ({ focused }) => icon("checkmark-circle", focused) }}
      />
      <Tabs.Screen
        name="finance"
        options={{ title: "Finance", tabBarIcon: ({ focused }) => icon("wallet", focused) }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat", tabBarIcon: ({ focused }) => icon("chatbubbles", focused) }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: ({ focused }) => icon("settings", focused) }}
      />
      {/* Screens accessible by navigation but hidden from tab bar */}
      <Tabs.Screen name="maintenance" options={{ href: null }} />
      <Tabs.Screen name="grocery" options={{ href: null }} />
      <Tabs.Screen name="disputes" options={{ href: null }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
    </Tabs>
  );
}
