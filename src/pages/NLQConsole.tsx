import { useState } from "react";
import type { NLQResponse } from "@/lib/api";

export default function NLQConsole() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<NLQResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/nlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      // ✅ Normalize to match NLQResponse (handle fallback messages)
      setResult({
        sql: data.sql ?? "",
        columns: data.columns ?? [],
        rows: data.rows ?? [],
        error: data.error,
        answer: data.answer, // 👈 make sure we keep friendly answers
      });
    } catch (err) {
      setResult({
        sql: "",
        rows: [],
        error: err instanceof Error ? err.message : "Unknown error",
      });
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

      {result && (
        <div className="mt-4 space-y-2">
          {/* 💬 Friendly fallback (non-SQL answers) */}
          {result.answer && (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-gray-700 italic">
              {result.answer}
            </div>
          )}

          {result.error && (
            <div className="text-red-600">❌ Error: {result.error}</div>
          )}

          {result.sql && (
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {result.sql}
            </pre>
          )}

          {result.rows && result.rows.length > 0 && (
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
                    )
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
