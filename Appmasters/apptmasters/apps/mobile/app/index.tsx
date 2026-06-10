import { ActivityIndicator, View } from "react-native";
import { Colors } from "../constants/colors";

// Entry point — NavigationGuard in _layout.tsx handles all redirects.
// This screen just shows a spinner while the auth state loads.
export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
