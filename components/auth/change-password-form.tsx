"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function ChangePasswordForm() {
  const router = useRouter();
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmPassword")) { setError("New passwords do not match"); return; }
    setPending(true); setError("");
    try { const response=await fetch("/api/auth/change-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentPassword:form.get("currentPassword"),newPassword:form.get("newPassword")})}); const data:any=await response.json(); if(!response.ok)throw new Error(data.error??"Unable to change password"); toast.success("Password changed"); router.replace("/"); router.refresh(); }
    catch(issue){setError(issue instanceof Error?issue.message:"Unable to change password");}
    finally{setPending(false);}
  }
  return <main className="grid min-h-dvh place-items-center bg-background px-5"><div className="w-full max-w-[430px]"><p className="text-xl font-semibold tracking-tight text-primary">Mend</p><h1 className="mt-10 text-3xl font-semibold tracking-[-.04em]">Set your own password.</h1><p className="mt-2 text-muted-foreground">For your first sign-in, choose a password with at least 12 characters.</p><form onSubmit={submit} className="mt-8 space-y-5"><div className="space-y-2"><Label htmlFor="currentPassword">Temporary password</Label><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></div><div className="space-y-2"><Label htmlFor="newPassword">New password</Label><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={12} required /></div><div className="space-y-2"><Label htmlFor="confirmPassword">Confirm new password</Label><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></div>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="h-11 w-full" disabled={pending}>{pending?"Saving…":"Save password"}</Button></form></div></main>;
}

