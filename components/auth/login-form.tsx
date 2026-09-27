"use client";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ username:form.get("username"), password:form.get("password") }) });
      const data:any = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Sign in failed");
      toast.success("Signed in");
      window.location.replace(data.user.mustChangePassword ? "/change-password" : "/");
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Sign in failed"); }
    finally { setPending(false); }
  }
  return <main className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(400px,520px)]">
    <div className="hidden border-r border-border bg-sidebar p-12 lg:flex lg:flex-col"><span className="text-2xl font-semibold tracking-[-.05em]">Mend</span><div className="my-auto max-w-[580px]"><p className="text-sm font-medium text-primary">ONE CALM PLACE TO WORK</p><h1 className="mt-6 text-[clamp(3rem,5vw,5.5rem)] font-semibold leading-[.98] tracking-[-.07em]">A clearer desk for every case.</h1><p className="mt-7 max-w-md text-lg leading-8 text-muted-foreground">Follow-ups, schedules, and RCC dispatch in one considered workspace.</p></div><p className="text-sm text-muted-foreground">Mend · Agent workspace</p></div>
    <div className="flex flex-col p-6 sm:p-10"><div className="flex items-center justify-between lg:justify-end"><span className="text-2xl font-semibold tracking-[-.05em] lg:hidden">Mend</span><ThemeToggle /></div><div className="m-auto w-full max-w-[360px] py-14"><span className="grid size-11 place-items-center rounded-xl bg-accent text-primary"><LockKeyhole className="size-5" /></span><h2 className="mt-7 text-3xl font-semibold tracking-[-.045em]">Welcome back.</h2><p className="mt-2 text-[15px] text-muted-foreground">Sign in with your Mend agent account.</p><form onSubmit={submit} className="mt-9 space-y-5"><div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" name="username" autoComplete="username" required autoFocus /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}<ArrowRight /></Button></form><p className="mt-7 text-sm leading-6 text-muted-foreground">Need access? Ask your Mend administrator to create your account.</p></div></div>
  </main>;
}

