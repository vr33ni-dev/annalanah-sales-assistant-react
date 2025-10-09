export function extractErrorMessage(err: unknown): string {
  // Narrow possible Axios-like errors without using `any`
  if (
    typeof err === "object" &&
    err !== null &&
    "isAxiosError" in err &&
    (err as { isAxiosError?: boolean }).isAxiosError === true
  ) {
    const axiosErr = err as {
      response?: { data?: unknown };
      message?: string;
    };

    const responseData = axiosErr.response?.data;
    if (typeof responseData === "string") {
      return responseData;
    }
    if (typeof responseData === "object" && responseData !== null) {
      try {
        return JSON.stringify(responseData);
      } catch {
        /* ignore */
      }
    }
    return axiosErr.message ?? "Unbekannter Axios-Fehler";
  }

  // Native Response (Fetch)
  if (err instanceof Response) {
    return `HTTP ${err.status} ${err.statusText}`;
  }

  // Standard Error
  if (err instanceof Error) {
    return err.message;
  }

  // Fallback
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
