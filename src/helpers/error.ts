export function extractErrorMessage(err: unknown): string {
  // --- Axios-like errors ---
  if (
    typeof err === "object" &&
    err !== null &&
    "isAxiosError" in err &&
    (err as { isAxiosError?: boolean }).isAxiosError === true
  ) {
    const axiosErr = err as {
      response?: {
        data?: unknown;
        status?: number;
      };
      message?: string;
    };

    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;

    // 409 Conflict — duplicate resource (e.g. email already in use)
    if (status === 409) {
      if (typeof data === "string" && data.trim()) return data;
      if (typeof data === "object" && data !== null) {
        const d = data as Record<string, unknown>;
        const msg = d.error ?? d.message ?? d.detail;
        if (typeof msg === "string" && msg.trim()) return msg;
      }
      return "Dieser Eintrag existiert bereits (Konflikt).";
    }

    if (typeof data === "string") return data;

    if (typeof data === "object" && data !== null) {
      const maybeError = data as Record<string, unknown>;
      if (typeof maybeError.error === "string") return maybeError.error;
      if (typeof maybeError.message === "string") return maybeError.message;
    }

    return axiosErr.message ?? "Unbekannter Fehler (Axios)";
  }

  // --- Native Fetch Response ---
  if (err instanceof Response) {
    return `HTTP ${err.status} ${err.statusText}`;
  }

  // --- Generic Error ---
  if (err instanceof Error) return err.message;

  // --- Fallback ---
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
