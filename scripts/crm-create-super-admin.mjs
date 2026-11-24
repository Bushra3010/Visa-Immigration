#!/usr/bin/env node
/**
 * Creates (or promotes) the initial CRM Super Admin.
 *
 *   node scripts/crm-create-super-admin.mjs --email you@company.com --username admin --name "Your Name"
 *
 * The password is prompted for (never passed on the command line or stored
 * in code). Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
 * .env.local / the environment. Passwords are hashed by Supabase Auth.
 */
import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
  });
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = arg("email")?.toLowerCase();
const username = arg("username")?.toLowerCase();
const name = arg("name") ?? "Super Admin";
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)."); process.exit(1); }
if (!email || !username || !/^[a-z0-9._-]{3,40}$/.test(username)) { console.error("Usage: --email <email> --username <3-40 chars a-z0-9._-> [--name \"Full Name\"]"); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: role, error: roleError } = await db.from("crm_roles").select("id").eq("key", "super_admin").single();
if (roleError || !role) { console.error("CRM roles not found — apply the supabase/migrations/2026112600000*_crm_*.sql migrations first."); process.exit(1); }

const { data: existing } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
let id = existing?.id;
if (!id) {
  const password = process.env.CRM_ADMIN_PASSWORD ?? (await askHidden("Password for the new Super Admin (10+ chars, letters and numbers): "));
  if (password.length < 10 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) { console.error("Password too weak."); process.exit(1); }
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) { console.error("Could not create user:", error.message); process.exit(1); }
  id = data.user.id;
  await db.from("profiles").update({ role: "crm_staff" }).eq("id", id);
} else {
  console.log("Account exists — granting CRM Super Admin (password unchanged).");
}
const { error } = await db.from("profiles").update({ full_name: name, crm_role_id: role.id, crm_username: username, crm_active: true, is_active: true, designation: "Super Admin" }).eq("id", id);
if (error) { console.error("Could not update profile:", error.message); process.exit(1); }
await db.from("audit_logs").insert({ actor_id: null, action: "user.super_admin_bootstrapped", module: "users", entity: "users", entity_id: id, changes: { email, username } });
console.log(`✓ ${name} can sign in at /crm/login as “${username}” or ${email}.`);
