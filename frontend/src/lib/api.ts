export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // If accessed via LAN IP or hostname (e.g. 192.168.1.5:3000), communicate with backend on same host
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

