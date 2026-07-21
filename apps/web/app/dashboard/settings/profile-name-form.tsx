"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        const payload = (await response.json()) as {
          error?: string;
          name?: string;
        };

        if (!response.ok || !payload.name) {
          throw new Error(payload.error || "Não foi possível atualizar seu nome");
        }

        setName(payload.name);
        setMessage("Nome atualizado com sucesso.");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível atualizar seu nome");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-sm text-gray-400">
          Nome
        </label>
        <input
          id="profile-name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={80}
          autoComplete="name"
          required
          disabled={isPending}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || name.trim() === initialName.trim()}
        className="app-button app-button--primary"
      >
        {isPending ? "Salvando..." : "Salvar nome"}
      </button>

      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
