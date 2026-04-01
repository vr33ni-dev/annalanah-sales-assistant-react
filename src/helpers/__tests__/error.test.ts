import { describe, it, expect } from "vitest";
import { extractErrorMessage } from "../error";

function makeAxiosError(
  options: {
    data?: unknown;
    status?: number;
    message?: string;
  } = {}
) {
  return {
    isAxiosError: true,
    response: {
      data: options.data,
      status: options.status ?? 500,
    },
    message: options.message ?? "Request failed",
  };
}

describe("extractErrorMessage", () => {
  describe("Axios errors", () => {
    it("returns string data directly when response.data is a string", () => {
      const err = makeAxiosError({ data: "Something went wrong" });
      expect(extractErrorMessage(err)).toBe("Something went wrong");
    });

    it("returns data.error when present in response object", () => {
      const err = makeAxiosError({ data: { error: "Validation failed" } });
      expect(extractErrorMessage(err)).toBe("Validation failed");
    });

    it("returns data.message when data.error is absent", () => {
      const err = makeAxiosError({ data: { message: "Not found" } });
      expect(extractErrorMessage(err)).toBe("Not found");
    });

    it("prefers data.error over data.message", () => {
      const err = makeAxiosError({
        data: { error: "Primary error", message: "Secondary message" },
      });
      expect(extractErrorMessage(err)).toBe("Primary error");
    });

    it("falls back to axios message when data is an object without known fields", () => {
      const err = makeAxiosError({ data: { unknown: "field" }, message: "Network Error" });
      expect(extractErrorMessage(err)).toBe("Network Error");
    });

    it("falls back to default message when axios message is missing", () => {
      const err = { isAxiosError: true, response: { data: null }, message: undefined };
      expect(extractErrorMessage(err)).toBe("Unbekannter Fehler (Axios)");
    });

    it("handles null response data", () => {
      const err = makeAxiosError({ data: null, message: "Timeout" });
      expect(extractErrorMessage(err)).toBe("Timeout");
    });

    it("handles number response data by falling back to axios message", () => {
      const err = makeAxiosError({ data: 42, message: "Unexpected response" });
      expect(extractErrorMessage(err)).toBe("Unexpected response");
    });
  });

  describe("Fetch Response errors", () => {
    it("returns HTTP status text for Response instances", () => {
      const response = new Response(null, { status: 404, statusText: "Not Found" });
      expect(extractErrorMessage(response)).toBe("HTTP 404 Not Found");
    });

    it("handles 500 server error", () => {
      const response = new Response(null, { status: 500, statusText: "Internal Server Error" });
      expect(extractErrorMessage(response)).toBe("HTTP 500 Internal Server Error");
    });
  });

  describe("Generic Error objects", () => {
    it("returns Error.message for native Error instances", () => {
      expect(extractErrorMessage(new Error("Something broke"))).toBe("Something broke");
    });

    it("handles TypeError", () => {
      expect(extractErrorMessage(new TypeError("Cannot read property"))).toBe(
        "Cannot read property"
      );
    });
  });

  describe("Fallback cases", () => {
    it("JSON stringifies plain objects", () => {
      const err = { code: 42, reason: "unknown" };
      expect(extractErrorMessage(err)).toBe(JSON.stringify(err));
    });

    it("stringifies primitive numbers", () => {
      expect(extractErrorMessage(42)).toBe("42");
    });

    it("stringifies primitive strings", () => {
      expect(extractErrorMessage("raw string")).toBe('"raw string"');
    });

    it("stringifies null", () => {
      expect(extractErrorMessage(null)).toBe("null");
    });

    it("stringifies undefined", () => {
      expect(extractErrorMessage(undefined)).toBe(undefined);
    });

    it("does not throw for circular objects", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      // JSON.stringify will throw, so it falls back to String(err)
      expect(() => extractErrorMessage(circular)).not.toThrow();
    });
  });
});
