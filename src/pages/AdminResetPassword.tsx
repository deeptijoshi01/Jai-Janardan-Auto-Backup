import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { AUTH_API_BASE_URL } from "../services/adminAuth";

const AdminResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.has("token")) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, [searchParams]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError("This password reset link is invalid or has expired.");
      return;
    }
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
      setError("Choose a password with at least 12 characters and no more than 72 UTF-8 bytes.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Unable to reset the password.");
      }
      setSuccess(true);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset the password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0f0e0c] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/15 bg-[#171612] p-6 shadow-2xl sm:p-9">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e0b866]/15 text-[#e0b866]">
          <LockKeyhole size={22} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-[#e0b866]">Admin account</p>
        <h1 className="mt-2 font-serif text-3xl">Set a new password</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Use at least 12 characters. Passwords are limited to 72 UTF-8 bytes.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        )}
        {success ? (
          <div role="status" className="mt-6 rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4">
            <p className="text-sm leading-6 text-emerald-100">
              Your password has been reset. You can now sign in using your new
              password.
            </p>
            <Link
              to="/admin/login"
              className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-[#e0b866] hover:text-[#f3d794]"
            >
              Continue to sign in <ArrowLeft size={17} className="rotate-180" />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-white/85">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/20 bg-white/[0.07] px-4 pr-12 text-white outline-none transition focus:border-[#e0b866] focus:ring-4 focus:ring-[#e0b866]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide new password" : "Show new password"}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e0b866]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-white/85">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/20 bg-white/[0.07] px-4 pr-12 text-white outline-none transition focus:border-[#e0b866] focus:ring-4 focus:ring-[#e0b866]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e0b866]"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#e8c477] to-[#c9a050] font-semibold text-[#14110a] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Updating…</> : "Reset password"}
            </button>
          </form>
        )}
        {!success && (
          <Link
            to="/admin/login"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#e0b866] hover:text-[#f3d794]"
          >
            <ArrowLeft size={17} /> Back to sign in
          </Link>
        )}
      </section>
    </main>
  );
};

export default AdminResetPassword;
