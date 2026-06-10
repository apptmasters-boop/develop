import { Stack } from "expo-router";
import { Colors } from "../../../constants/colors";

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: "700", color: Colors.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="group" options={{ title: "Group Chat" }} />
      <Stack.Screen name="dm/[userId]" options={{ title: "Direct Message" }} />
    </Stack>
  );
}
