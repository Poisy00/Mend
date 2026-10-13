"use client";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function ChangePasswordForm() {
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmPassword")) { setError("New passwords do not match"); return; }
    setPending(true); setError("");
    try { const response=await fetch("/api/auth/change-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentPassword:form.get("currentPassword"),newPassword:form.get("newPassword")})}); const data:any=await response.json(); if(!response.ok)throw new Error(data.error??"Unable to change password"); toast.success("Password changed"); window.location.replace("/"); }
    catch(issue){setError(issue instanceof Error?issue.message:"Unable to change password");}
    finally{setPending(false);}
  }
  return <main className="grid min-h-dvh place-items-center bg-desk px-5 py-10">
    <div className="w-full max-w-[430px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mend-logo.svg" width={152} height={43} alt="Mend" className="mend-logo mx-auto mb-8 h-auto w-[152px]" />
      <section aria-labelledby="change-password-title" className="rounded-[14px] bg-sheet p-8 shadow-[0_0_0_1px_var(--border),0_12px_36px_-20px_rgb(0_0_0/.18)]">
        <h1 id="change-password-title" className="t-title">Set your own password.</h1>
        <p className="t-body-lg mt-2 text-text-secondary">For your first sign-in, choose a password with at least 12 characters.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2"><Label htmlFor="currentPassword">Temporary password</Label><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></div>
          <div className="space-y-2"><Label htmlFor="newPassword">New password</Label><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={12} required /></div>
          <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm new password</Label><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></div>
          {error&&<p role="alert" className="t-meta text-destructive">{error}</p>}
          <Button className="h-11 w-full" disabled={pending}>{pending?"Saving…":"Save password"}</Button>
        </form>
      </section>
    </div>
  </main>;
}
