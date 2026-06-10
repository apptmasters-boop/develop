import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ApptMasters",
  slug: "apptmasters",
  version: "2.0.0",
  orientation: "portrait",
  scheme: "apptmasters",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.apptmasters.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.apptmasters.app",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#6366f1" }],
    "expo-camera",
    "expo-image-picker",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: "apptmasters" },
  },
});
