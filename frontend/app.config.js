const os = require("os");
const appJson = require("./app.json");

function normalizeApiBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function detectLocalIpv4() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces || {})) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== "IPv4" || entry.internal) continue;
      const ip = String(entry.address || "").trim();
      if (!ip) continue;
      if (
        ip.startsWith("192.168.") ||
        ip.startsWith("10.") ||
        ip.startsWith("172.16.") ||
        ip.startsWith("172.17.") ||
        ip.startsWith("172.18.") ||
        ip.startsWith("172.19.") ||
        ip.startsWith("172.2") ||
        ip.startsWith("172.30.") ||
        ip.startsWith("172.31.")
      ) {
        return ip;
      }
    }
  }
  return "";
}

module.exports = ({ config }) => {
  const base = appJson.expo || {};
  const extra = base.extra || {};
  const ip = detectLocalIpv4();
  const autoApiBaseUrl = ip ? `http://${ip}:3000` : "";
  const devApiBaseUrl = normalizeApiBaseUrl(
    process.env.API_URL ||
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      autoApiBaseUrl
  );
  const prodApiBaseUrl = normalizeApiBaseUrl(
    process.env.PROD_API_URL ||
      process.env.EXPO_PUBLIC_PROD_API_URL ||
      process.env.EXPO_PUBLIC_PROD_API_BASE_URL ||
      ""
  );
  const apiBaseUrl = prodApiBaseUrl || devApiBaseUrl;

  return {
    ...config,
    ...base,
    extra: {
      ...extra,
      apiUrl: apiBaseUrl,
      apiBaseUrl,
      devApiUrl: devApiBaseUrl,
      devApiBaseUrl,
      prodApiUrl: prodApiBaseUrl,
      prodApiBaseUrl,
      localLanIp: ip || "",
    },
  };
};
