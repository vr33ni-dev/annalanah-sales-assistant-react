import { useState } from "react";
import { runNLQ, NLQHttpError, type NLQResponse } from "@/lib/api";

interface HttpErrorState {
  status: number;
  message: string;
}

const HTTP_ERROR_LABELS: Record<number, string> = {
  402: "Billing required",
  429: "Rate limited",
  502: "AI service unavailable",
  500: "Server error",
};

export default function NLQConsole() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<NLQResponse | null>(null);
  const [httpError, setHttpError] = useState<HttpErrorState | null>(null);
  const [loading, setLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    setResult(null);
    setHttpError(null);
    try {
      const data = await runNLQ(question);
      setResult(data);
    } catch (err) {
      if (err instanceof NLQHttpError) {
        setHttpError({ status: err.status, message: err.message });
      } else {
        setResult({
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">🧠 Natural Language Query</h1>

      <textarea
        className="w-full border rounded p-2"
        rows={3}
        placeholder="Ask a question, e.g. 'Zeige mir Kunden, deren Follow-Up noch aussteht'"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button
        onClick={runQuery}
        disabled={loading || !question.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Running..." : "Ask"}
      </button>

      {/* Non-200 HTTP errors */}
      {httpError && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4">
          <p className="font-semibold text-red-700">
            {HTTP_ERROR_LABELS[httpError.status] ?? `Error ${httpError.status}`}
          </p>
          <p className="mt-1 text-red-600 text-sm">{httpError.message}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          {/* Friendly answer for non-data questions */}
          {result.answer && !result.error && (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-gray-700 italic">
              {result.answer}
            </div>
          )}

          {/* 200-level business-logic errors (unsafe SQL, DB errors) */}
          {result.error && (
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <p className="text-red-600 text-sm">❌ {result.error}</p>
              {result.sql && (
                <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {result.sql}
                </pre>
              )}
            </div>
          )}

          {!result.error && result.sql && (
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {result.sql}
            </pre>
          )}

          {!result.error && result.rows && result.rows.length > 0 && (
            <table className="min-w-full border mt-2 text-sm">
              <thead>
                <tr>
                  {(result.columns ?? Object.keys(result.rows[0])).map(
                    (col) => (
                      <th
                        key={col}
                        className="border px-2 py-1 text-left bg-gray-50"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {(result.columns ?? Object.keys(row)).map((col) => (
                      <td key={col} className="border px-2 py-1">
                        {row[col] === null || row[col] === undefined
                          ? "—"
                          : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
