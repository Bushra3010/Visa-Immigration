import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { ProfileForm } from "@/components/app/account-forms";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, email, mobile, date_of_birth, country_of_residence").eq("id", viewer.id).single();
  return (
    <>
      <PageHeader title="Profile" />
      <ProfileForm profile={data ?? { full_name: viewer.fullName, email: viewer.email, mobile: null, date_of_birth: null, country_of_residence: null }} />
    </>
  );
}
