const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";
export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "");
