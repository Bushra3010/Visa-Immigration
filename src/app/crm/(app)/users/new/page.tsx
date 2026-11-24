import type { Metadata } from "next";
import { PageHeader } from "@/components/crm/blocks";
import { StaffForm } from "@/components/crm/user-forms";
import { requireCrm } from "@/lib/crm/auth";
import { staffFormOptions } from "../options";

export const metadata: Metadata = { title: "New user" };

export default async function NewUserPage() {
  const viewer = await requireCrm("users.create");
  const opts = await staffFormOptions(viewer);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Create CRM user" description="The password is stored hashed by Supabase Auth; share it with the employee securely." back={{ href: "/crm/users", label: "Users" }} />
      <StaffForm mode="create" roles={opts.roles} managers={opts.managers} />
    </div>
  );
}
