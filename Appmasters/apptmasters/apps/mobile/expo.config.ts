import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ApptMasters",
  slug: "apptmasters",
  version: "2.0.0",
  orientation: "portrait",
  scheme: "apptmasters",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.apptmasters.app",
  },
  android: {
    package: "com.apptmasters.app",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
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
