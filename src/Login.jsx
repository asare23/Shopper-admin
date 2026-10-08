import { useState } from "react";
import { supabase } from "./config";

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

    if (result.error) setError(result.error.message);
    else if (mode === "signup" && !result.data.session) {
      setMessage(
        "Account created. Check your email to confirm your address, then sign in.",
      );
    }
    setBusy(false);
  }

  return (
    <section id="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Shopper Admin</h1>
        <p>
          {mode === "signup"
            ? "Create an admin account."
            : "Sign in to manage your products."}
        </p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pass">Password</label>
          <input
            id="pass"
            type="password"
            required
            minLength={6}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {mode === "signup" && (
          <div className="field">
            <label htmlFor="confirm-pass">Confirm password</label>
            <input
              id="confirm-pass"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}
        <div className="err">{error}</div>
        {message && (
          <div role="status" className="success-message">
            {message}
          </div>
        )}
        <button
          className="btn primary"
          style={{ width: "100%" }}
          disabled={busy}
        >
          {busy
            ? "Please wait..."
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
        <button
          className="btn"
          type="button"
          style={{ width: "100%", marginTop: 10 }}
          disabled={busy}
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError("");
            setMessage("");
          }}
        >
          {mode === "signup"
            ? "Have an account? Sign in"
            : "Create admin account"}
        </button>
      </form>
    </section>
  );
}
