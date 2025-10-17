// src/pages/Login.tsx
import { Button } from "@/components/ui/button";

export default function Login() {
  const goLogin = () => {
    const here = window.location.href;
    // Avoid looping back to /login after auth
    const target = window.location.pathname === "/login" ? "/" : here;

    // Same-origin route; Render rewrite proxies this to the API
    window.location.href = `/auth/google?redirect=${encodeURIComponent(
      location.href
    )}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full border rounded-xl p-6 bg-card">
        <h1 className="text-xl font-semibold mb-4">Login</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Der Zugriff ist auf das Annalanah Team beschränkt.
        </p>
        <Button className="w-full" onClick={goLogin}>
          Mit Google anmelden
        </Button>
      </div>
    </div>
  );
}
