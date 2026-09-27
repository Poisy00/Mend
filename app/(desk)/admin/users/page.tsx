import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/server/page-auth";
import { MendShell } from "@/components/mend-shell";
import { AdminUsers } from "@/components/admin/users";
export default async function AdminUsersPage(){const user=await getPageSession();if(!user||user.role!=="admin")redirect("/");return <MendShell currentArea="today"><AdminUsers /></MendShell>;}
