// For physical device testing, replace localhost with your machine's local IP
// e.g. "http://192.168.1.100:4000"
// For iOS Simulator: "http://localhost:4000"
// For Android Emulator: "http://10.0.2.2:4000"
export const API_BASE = __DEV__
  ? "http://localhost:4000"
  : "https://apptmasters.com";
