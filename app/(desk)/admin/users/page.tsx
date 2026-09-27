import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/server/page-auth";
import { AdminUsers } from "@/components/admin/users";
import { listAgents } from "@/lib/server/admin";
export default async function AdminUsersPage(){const user=await requirePageSession();if(user.role!=="admin")redirect("/");const initialUsers=await listAgents(user.id);return <AdminUsers initialUsers={initialUsers} />;}
