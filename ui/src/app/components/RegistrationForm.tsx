import { useState } from "react";

type Props = {
  onSuccess: () => void;
};

export default function RegistrationForm({ onSuccess }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const deviceId = await window.api.getDeviceId();

        const res = await fetch("https://arx.prodautomate.com/api/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            device_id: deviceId,
          }),
        });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Ошибка активации");
        setLoading(false);
        return;
      }

      // 🔥 САМОЕ ВАЖНОЕ
      localStorage.setItem("user_id", data.user_id.toString());

      onSuccess(); // говорим App: всё, пользователь активен
    } catch (err) {
      setError("Сервер недоступен");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <form
        onSubmit={handleSubmit}
        className="bg-card-bg border border-card-border rounded-2xl p-8 w-full max-w-sm shadow-2xl space-y-4"
      >

        <h2 className="text-xl font-bold text-center text-white">
          Enter Access Code
        </h2>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="
              w-full
              bg-[#0b0c10]
              border border-white/10
              px-3 py-2
              rounded-xl
              text-white
              placeholder:text-neutral-500
              outline-none
              focus:border-blue-500/50
            "
          placeholder="XXXX-XXXX-XXXX"
        />

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="
              w-full
              py-2.5
              rounded-xl
              bg-blue-600/80
              border border-blue-500/30
              text-white
              hover:bg-blue-600
              transition-all
              shadow-lg
            "
        >
          {loading ? "Verification..." : "Activate"}
        </button>
      </form>
    </div>
  );
}
