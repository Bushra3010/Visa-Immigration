"use client";

import { useMemo, useState } from "react";
import { createRole, createStaffUser, deleteRole, saveRolePermissions, setStaffPassword, updateStaffUser } from "@/lib/crm/actions/users";
import { CRM_ACTIONS, CRM_MODULES, CRM_PERMISSION_ALIASES, CRM_SPECIAL_PERMISSIONS, DATA_SCOPES } from "@/lib/crm/permissions";
import { cn } from "@/lib/utils";
import { CheckboxField, FileField, FormSection, SelectField, TextAreaField, TextField } from "./fields";
import { ConfirmButton, CrmForm, Modal } from "./interactive";

type Opt = { value: string; label: string };
const s = (v: unknown) => (v === null || v === undefined ? null : String(v));

export function StaffForm({ values, roles, managers, mode }: { values?: Record<string, unknown>; roles: Opt[]; managers: Opt[]; mode: "create" | "edit" }) {
  return (
    <CrmForm action={mode === "create" ? createStaffUser : updateStaffUser} submitLabel={mode === "create" ? "Create user" : "Save user"} className="space-y-5">
      {values?.id ? <input type="hidden" name="id" value={String(values.id)} /> : null}
      <FormSection title="Employee details">
        <TextField label="Full name" name="full_name" required defaultValue={s(values?.full_name)} />
        <TextField label="Employee ID" name="employee_id" defaultValue={s(values?.employee_id)} placeholder="e.g. NV-014" />
        <TextField label="Mobile number" name="mobile" type="tel" defaultValue={s(values?.mobile)} />
        <TextField label="Designation" name="designation" defaultValue={s(values?.designation)} />
        <TextField label="Department" name="department" defaultValue={s(values?.department)} placeholder="Sales, Documentation, Accounts…" />
        <TextField label="Joining date" name="joining_date" type="date" defaultValue={s(values?.joining_date)} />
        <FileField label="Profile picture" name="avatar" accept="image/jpeg,image/png,image/webp" hint="JPG, PNG or WebP, up to 2 MB" />
        {mode === "edit" && !!values?.avatar_url && <div className="flex items-end pb-2"><CheckboxField name="remove_avatar" label="Remove current picture" /></div>}
      </FormSection>
      <FormSection title="Login & access">
        {mode === "create" ? <TextField label="Work email" name="email" type="email" required autoComplete="off" /> : <TextField label="Email" name="email_display" defaultValue={s(values?.email)} readOnly hint="Email can't be changed here" />}
        <TextField label="Username" name="crm_username" required defaultValue={s(values?.crm_username)} autoComplete="off" hint="Used to sign in (lowercase)" />
        <SelectField label="Role" name="crm_role_id" required options={roles} defaultValue={s(values?.crm_role_id)} />
        <SelectField label="Reports to (manager)" name="crm_manager_id" options={managers.filter((m) => m.value !== values?.id)} defaultValue={s(values?.crm_manager_id)} placeholder="Nobody" hint="Managers with team visibility see their reports' leads" />
        <SelectField label="Account status" name="crm_active" allowEmpty={false} defaultValue={values?.crm_active === false ? "inactive" : "active"} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive (cannot sign in to the CRM)" }]} />
        {mode === "create" && <>
          <TextField label="Password" name="password" type="password" required autoComplete="new-password" hint="10+ characters with letters and numbers" />
          <TextField label="Confirm password" name="confirm_password" type="password" required autoComplete="new-password" />
        </>}
      </FormSection>
    </CrmForm>
  );
}

export function SetPassword({ userId }: { userId: string }) {
  return (
    <Modal title="Set a new password" description="The employee can change it later from their profile." trigger="Set password" triggerVariant="secondary" size="sm">
      <CrmForm action={setStaffPassword} submitLabel="Update password" resetOnSuccess>
        <input type="hidden" name="id" value={userId} />
        <TextField label="New password" name="password" type="password" required autoComplete="new-password" hint="10+ characters with letters and numbers" />
        <TextField label="Confirm password" name="confirm_password" type="password" required autoComplete="new-password" />
      </CrmForm>
    </Modal>
  );
}

export function NewRole({ roles }: { roles: Opt[] }) {
  return (
    <Modal title="Create custom role" trigger="New role" size="md">
      <CrmForm action={createRole} submitLabel="Create role">
        <TextField label="Role name" name="name" required placeholder="e.g. Branch Manager – Rohini" />
        <TextAreaField label="Description" name="description" rows={2} />
        <SelectField label="Record visibility" name="data_scope" allowEmpty={false} defaultValue="own" options={DATA_SCOPES.map((d) => ({ value: d.value, label: d.label }))} />
        <SelectField label="Copy permissions from" name="copy_from" options={roles} placeholder="Start empty" />
      </CrmForm>
    </Modal>
  );
}

/** Module × action permission grid with record-visibility and special permissions. */
export function PermissionMatrix({ role, granted, locked }: {
  role: { id: string; name: string; description: string | null; data_scope: string; is_system: boolean; is_super: boolean }; granted: string[]; locked: boolean;
}) {
  const [perms, setPerms] = useState(() => new Set(granted));
  const toggle = (k: string) => setPerms((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const rowAll = (m: string) => CRM_ACTIONS.every((a) => perms.has(`${m}.${a}`));
  const setRow = (m: string, on: boolean) => setPerms((p) => { const n = new Set(p); CRM_ACTIONS.forEach((a) => (on ? n.add(`${m}.${a}`) : n.delete(`${m}.${a}`))); return n; });
  const colAll = (a: string) => CRM_MODULES.every((m) => perms.has(`${m.key}.${a}`));
  const setCol = (a: string, on: boolean) => setPerms((p) => { const n = new Set(p); CRM_MODULES.forEach((m) => (on ? n.add(`${m.key}.${a}`) : n.delete(`${m.key}.${a}`))); return n; });
  const count = useMemo(() => perms.size, [perms]);
  const disabled = locked || role.is_super;

  return (
    <CrmForm action={saveRolePermissions} submitLabel={`Save permissions (${count})`} hideSubmit={disabled} className="space-y-5">
      <input type="hidden" name="id" value={role.id} />
      {[...perms].map((p) => <input key={p} type="hidden" name="perm" value={p} />)}
      <FormSection title="Role">
        <TextField label="Role name" name="name" required defaultValue={role.name} readOnly={disabled} />
        <TextField label="Description" name="description" defaultValue={role.description} className="sm:col-span-2" readOnly={disabled} />
      </FormSection>

      <fieldset className="rounded-xl border border-line bg-white p-4 sm:p-5" disabled={disabled}>
        <legend className="sr-only">Record visibility</legend>
        <h3 className="font-semibold">Lead & record visibility</h3>
        <p className="mb-3 text-xs text-muted">Applies to leads, customers, applications, documents and payments — enforced by the database.</p>
        <div className="grid gap-2 md:grid-cols-3">
          {DATA_SCOPES.map((d) => (
            <label key={d.value} className="flex cursor-pointer gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="data_scope" value={d.value} defaultChecked={(role.is_super ? "all" : role.data_scope) === d.value} className="mt-0.5 accent-brand-600" />
              <span><span className="font-medium">{d.label}</span><span className="block text-xs text-muted">{d.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-canvas/70 text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Module</th>
              {CRM_ACTIONS.map((a) => (
                <th key={a} className="px-2 py-3 text-center">
                  <label className="flex flex-col items-center gap-1">
                    <span>{a}</span>
                    <input type="checkbox" disabled={disabled} checked={role.is_super || colAll(a)} onChange={(e) => setCol(a, e.target.checked)} className="size-3.5 accent-brand-600" aria-label={`All ${a}`} />
                  </label>
                </th>
              ))}
              <th className="px-3 py-3 text-center">All</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {CRM_MODULES.map((m) => (
              <tr key={m.key} className="hover:bg-canvas/50">
                <td className="px-4 py-2.5 font-medium">{m.label}</td>
                {CRM_ACTIONS.map((a) => {
                  const k = `${m.key}.${a}`;
                  return (
                    <td key={a} className="px-2 py-2.5 text-center">
                      <input type="checkbox" disabled={disabled} checked={role.is_super || perms.has(k)} onChange={() => toggle(k)} className="size-4 accent-brand-600" aria-label={`${m.label}: ${a}`} />
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center"><input type="checkbox" disabled={disabled} checked={role.is_super || rowAll(m.key)} onChange={(e) => setRow(m.key, e.target.checked)} className="size-4 accent-brand-600" aria-label={`All ${m.label}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <fieldset className="rounded-xl border border-line bg-white p-4 sm:p-5" disabled={disabled}>
        <legend className="sr-only">Additional permissions</legend>
        <h3 className="mb-3 font-semibold">Additional permissions</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {[...CRM_SPECIAL_PERMISSIONS, ...CRM_PERMISSION_ALIASES.map((a) => ({ key: a.key, label: a.label, hint: `Same as the “${a.key.split(".")[1]}” box for ${a.key.split(".")[0]}` }))].map((p) => (
            <label key={p.key} className={cn("flex cursor-pointer gap-2 rounded-xl border border-line p-3 text-sm", (role.is_super || perms.has(p.key)) && "border-brand-200 bg-brand-50/50")}>
              <input type="checkbox" checked={role.is_super || perms.has(p.key)} onChange={() => toggle(p.key)} className="mt-0.5 size-4 accent-brand-600" />
              <span><span className="font-medium">{p.label}</span><span className="block text-xs text-muted">{p.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      {role.is_super && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">Super Admin has unrestricted access to every module and record. This can&apos;t be reduced.</p>}
      {locked && !role.is_super && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Only a Super Admin can change role permissions.</p>}
    </CrmForm>
  );
}

export function DeleteRole({ id, name }: { id: string; name: string }) {
  return <ConfirmButton action={deleteRole} fields={{ id }} title={`Delete “${name}”?`} message="Only possible when no users have this role." confirmLabel="Delete role">Delete role</ConfirmButton>;
}
