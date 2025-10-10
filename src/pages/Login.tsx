// Login.tsx
import { Button } from "@/components/ui/button";
import { AUTH_BASE } from "@/lib/api"; // or wherever you export it

export default function Login() {
  const goLogin = () => {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.href = `${AUTH_BASE}/auth/google?redirect=${returnTo}`;
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
