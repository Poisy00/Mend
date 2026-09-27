"use client";

import { FormEvent, useRef, useState } from "react";
import { clsx } from "clsx";
import styles from "./login-form.module.css";

type Phase = "idle" | "connecting" | "connected" | "success" | "failed";
type Field = "username" | "password";

function pause(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
}

export function LoginForm() {
  const cardRef = useRef<HTMLElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [revealed, setRevealed] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);
  const [focusY, setFocusY] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<Field, boolean>>({ username: false, password: false });
  const [error, setError] = useState("");

  function focusField(field: Field) {
    const input = field === "username" ? usernameRef.current : passwordRef.current;
    const card = cardRef.current;
    if (!input || !card) return;
    const inputBounds = input.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    setFocusY(inputBounds.top - cardBounds.top + inputBounds.height / 2 - 4);
    setFocused(field);
  }

  function blurField(field: Field) {
    const input = field === "username" ? usernameRef.current : passwordRef.current;
    setFieldErrors(previous => ({ ...previous, [field]: !input?.value.trim() }));
    window.requestAnimationFrame(() => {
      if (document.activeElement === usernameRef.current) focusField("username");
      else if (document.activeElement === passwordRef.current) focusField("password");
      else setFocused(null);
    });
  }

  function clearFieldError(field: Field) {
    setFieldErrors(previous => ({ ...previous, [field]: false }));
    if (error) setError("");
    if (phase === "failed") setPhase("idle");
  }

  function togglePassword() {
    setRevealed(previous => !previous);
    setSwapping(false);
    window.requestAnimationFrame(() => setSwapping(true));
    window.setTimeout(() => setSwapping(false), 230);
    passwordRef.current?.focus({ preventScroll: true });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "connecting" || phase === "connected" || phase === "success") return;

    const username = usernameRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    const missing = { username: !username, password: !password.trim() };
    setFieldErrors(missing);
    setError("");
    if (missing.username || missing.password) {
      (missing.username ? usernameRef.current : passwordRef.current)?.focus();
      return;
    }

    setPhase("connecting");
    const started = performance.now();
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json() as { error?: string; user?: { mustChangePassword: boolean } };
      if (!response.ok || !data.user) throw new Error(data.error ?? "Sign in failed");

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reducedMotion) await pause(Math.max(0, 390 - (performance.now() - started)));
      setPhase("connected");
      if (!reducedMotion) await pause(460);
      setPhase("success");
      if (!reducedMotion) await pause(610);
      window.location.replace(data.user.mustChangePassword ? "/change-password" : "/");
    } catch (issue) {
      setPhase("failed");
      setError(issue instanceof Error ? issue.message : "Unable to sign in");
      passwordRef.current?.focus({ preventScroll: true });
      window.setTimeout(() => setPhase(current => current === "failed" ? "idle" : current), 900);
    }
  }

  return <main className={styles.scene}>
    <div className={styles.brand}>
      <div className={styles.logoReveal}>
        {/* The supplied SVG is the exact brand artwork used by the motion proof. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.logo} src="/mend-logo.svg" width="829" height="236" alt="Mend" />
      </div>
      <p className={styles.tagline}>A clearer desk for every case.</p>
    </div>

    <section ref={cardRef} className={clsx(styles.card, phase === "success" && styles.cardSuccess)} aria-labelledby="login-title">
      <span className={clsx(styles.focusNode, focused && styles.focusVisible)} style={{ transform: `translateY(${focusY}px) scale(${focused ? 1 : 0.28})` }} aria-hidden="true" />
      <h1 id="login-title">Sign in</h1>

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="username">Username</label>
          <input ref={usernameRef} className={styles.input} id="username" name="username" autoComplete="username" autoCapitalize="none" placeholder="Enter your username" aria-invalid={fieldErrors.username} aria-describedby={fieldErrors.username ? "username-error" : undefined} onFocus={() => focusField("username")} onBlur={() => blurField("username")} onInput={() => clearFieldError("username")} />
          {fieldErrors.username && <p className={styles.fieldError} id="username-error">Enter your username.</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <div className={clsx(styles.passwordControl, swapping && styles.swapping)}>
            <input ref={passwordRef} className={clsx(styles.input, styles.passwordInput)} id="password" name="password" type={revealed ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" aria-invalid={fieldErrors.password} aria-describedby={fieldErrors.password ? "password-error" : undefined} onFocus={() => focusField("password")} onBlur={() => blurField("password")} onInput={() => clearFieldError("password")} />
            <button className={clsx(styles.eye, revealed && styles.eyeRevealed, swapping && styles.eyeBlink)} type="button" aria-label={revealed ? "Hide password" : "Show password"} aria-pressed={revealed} title={revealed ? "Hide password" : "Show password"} onClick={togglePassword}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <g className={styles.eyeOpen}><path d="M2.8 12s3.35-5 9.2-5 9.2 5 9.2 5-3.35 5-9.2 5-9.2-5-9.2-5Z" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.45" fill="none" stroke="currentColor" strokeWidth="1.65" /></g>
                <g className={styles.eyeClosed}><path d="M4 13.4c2.05-2.35 4.67-3.52 8-3.52s5.95 1.17 8 3.52" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M7.3 15.25l-.85 1.25M12 15.75v1.5M16.7 15.25l.85 1.25" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" /></g>
              </svg>
            </button>
          </div>
          {fieldErrors.password && <p className={styles.fieldError} id="password-error">Enter your password.</p>}
        </div>

        <div className={styles.formErrorSlot} aria-live="polite">
          {error && <p className={styles.formError} role="alert">{error}</p>}
        </div>
        <button className={clsx(styles.login, styles[phase])} type="submit" disabled={phase === "connecting" || phase === "connected" || phase === "success"} aria-label={phase === "connecting" || phase === "connected" ? "Signing in" : phase === "success" ? "Signed in" : "Log in"}>
          <span className={styles.loginLabel}>Log in <svg className={styles.arrow} viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span className={styles.connector} aria-hidden="true"><span className={clsx(styles.connectorPiece, styles.left)} /><span className={clsx(styles.connectorPiece, styles.right)} /><span className={styles.irisDot} /><svg className={styles.check} viewBox="0 0 20 20"><path d="M4 10.5l4 4L16 6" /></svg></span>
        </button>
      </form>

      <div className={styles.divider} />
      <p className={styles.help}>Forgot your password?<br /><strong>Contact your administrator.</strong></p>
    </section>
  </main>;
}
