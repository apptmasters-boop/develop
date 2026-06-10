import { Redirect } from "expo-router";

// Expo Router v3 gives the chat/ directory priority over this file.
// This fallback is never reached in normal routing.
export default function ChatFallback() {
  return <Redirect href="/chat" />;
}
