import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { AUTH_API_BASE_URL } from "../services/adminAuth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AdminForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedEmail = email.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Unable to request a password reset.");
      }
      setMessage(data.message || "If an account matches that email address, reset instructions will be sent shortly.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request a password reset."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0f0e0c] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/15 bg-[#171612] p-6 shadow-2xl sm:p-9">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e0b866]/15 text-[#e0b866]">
          <Mail size={22} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-[#e0b866]">Admin account</p>
        <h1 className="mt-2 font-serif text-3xl">Forgot your password?</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Enter the email address registered to your admin account. If it
          matches, we’ll send a secure reset link.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-white/85">
              Registered email address
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/20 bg-white/[0.07] px-4 text-white outline-none transition placeholder:text-white/40 focus:border-[#e0b866] focus:ring-4 focus:ring-[#e0b866]/10"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#e8c477] to-[#c9a050] font-semibold text-[#14110a] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 flex items-center gap-2 text-xs leading-5 text-white/50">
          <ShieldCheck size={16} className="shrink-0 text-[#e0b866]" />
          Reset links expire after 15 minutes and can only be used once.
        </p>
        <Link
          to="/admin/login"
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#e0b866] hover:text-[#f3d794]"
        >
          <ArrowLeft size={17} /> Back to sign in
        </Link>
      </section>
    </main>
  );
};

export default AdminForgotPassword;
