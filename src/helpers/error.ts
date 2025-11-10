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

    const data = axiosErr.response?.data;

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
