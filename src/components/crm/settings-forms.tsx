"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { deleteCustomField, deleteOption, deleteStage, moveStage, saveCompany, saveCustomField, saveOption, savePreferences, saveStage, setDefaultStage, updateOwnProfile } from "@/lib/crm/actions/settings";
import { crmChangePassword, crmSignOutOthers } from "@/lib/crm/actions/auth";
import { CheckboxField, FileField, SelectField, TextAreaField, TextField } from "./fields";
import { ActionButton, ConfirmButton, CrmForm, Modal } from "./interactive";

type Company = { name: string; email?: string; phone?: string; address?: string; gstin?: string; website?: string; logo_url?: string | null };

export function CompanyForm({ company, editable }: { company: Company; editable: boolean }) {
  return (
    <CrmForm action={saveCompany} submitLabel="Save company details" hideSubmit={!editable}>
      <input type="hidden" name="logo_url" value={company.logo_url ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Company name" name="name" required defaultValue={company.name} />
        <TextField label="GSTIN" name="gstin" defaultValue={company.gstin} />
        <TextField label="Email" name="email" type="email" defaultValue={company.email} />
        <TextField label="Phone" name="phone" defaultValue={company.phone} />
        <TextField label="Website" name="website" defaultValue={company.website} />
        <FileField label="Company logo" name="logo" accept="image/jpeg,image/png,image/webp" hint="Shown on receipts · JPG/PNG/WebP up to 2 MB" />
        <TextAreaField label="Address" name="address" defaultValue={company.address} className="sm:col-span-2" rows={2} />
        {company.logo_url && (
          <div className="flex items-center gap-4 sm:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={company.logo_url} alt="Current logo" className="h-12 w-auto rounded border border-line bg-white p-1" />
            <CheckboxField name="remove_logo" label="Remove logo (use the default New Visa logo)" />
          </div>
        )}
      </div>
    </CrmForm>
  );
}

const NOTIFY = [
  { key: "lead_assigned", label: "Notify employees when a lead is assigned to them" },
  { key: "follow_up_reminders", label: "Notify employees when someone schedules a follow-up for them" },
  { key: "expense_submitted", label: "Notify approvers about new expenses" },
  { key: "expense_decided", label: "Notify employees when their expense is approved or rejected" },
  { key: "document_rejected", label: "Highlight rejected documents to the uploader" },
];

export function PreferencesForm({ currency, notifications, editable }: { currency: string; notifications: Record<string, boolean>; editable: boolean }) {
  return (
    <CrmForm action={savePreferences} submitLabel="Save preferences" hideSubmit={!editable}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Currency" name="currency" defaultValue={currency} allowEmpty={false} options={["INR", "USD", "EUR", "GBP", "AED", "AUD", "CAD"].map((c) => ({ value: c, label: c }))} hint="Used for packages, payments, expenses and reports" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">In-app notifications</p>
        {NOTIFY.map((n) => <CheckboxField key={n.key} name={`n_${n.key}`} label={n.label} defaultChecked={notifications[n.key] !== false} />)}
        <p className="text-xs text-muted">Email and WhatsApp delivery use the site&apos;s notification providers once they are configured.</p>
      </div>
    </CrmForm>
  );
}

type StageRow = { id: string; name: string; color: string; is_default: boolean; is_won: boolean; is_lost: boolean; is_active: boolean; leads: number };

function StageFields({ stage }: { stage?: StageRow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {stage && <input type="hidden" name="id" value={stage.id} />}
      <TextField label="Stage name" name="name" required defaultValue={stage?.name} />
      <TextField label="Colour" name="color" type="color" defaultValue={stage?.color ?? "#3b82f6"} />
      <SelectField label="Stage type" name="kind" allowEmpty={false} defaultValue={stage?.is_won ? "won" : stage?.is_lost ? "lost" : "open"} options={[
        { value: "open", label: "Open (in progress)" }, { value: "won", label: "Won / converted" }, { value: "lost", label: "Lost / closed" },
      ]} hint="Won stages are reached through lead conversion" />
      {stage && <div className="flex items-end pb-2"><CheckboxField name="is_active" label="Show in pipeline" defaultChecked={stage.is_active} /></div>}
    </div>
  );
}

export function StagesManager({ stages, editable }: { stages: StageRow[]; editable: boolean }) {
  return (
    <div className="space-y-3">
      {editable && (
        <div className="flex justify-end">
          <Modal title="Add pipeline stage" trigger={<><Plus className="size-4" />Add stage</>} size="sm">
            <CrmForm action={saveStage} submitLabel="Add stage"><StageFields /></CrmForm>
          </Modal>
        </div>
      )}
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {stages.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="size-4 rounded-full ring-2 ring-white" style={{ backgroundColor: s.color }} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.name} {!s.is_active && <span className="text-xs font-normal text-muted">(hidden)</span>}</p>
              <p className="text-xs text-muted">{s.leads} lead{s.leads === 1 ? "" : "s"}{s.is_default && " · default for new leads"}{s.is_won && " · won stage"}{s.is_lost && " · lost stage"}</p>
            </div>
            {editable && (
              <div className="flex items-center gap-0.5">
                <ActionButton action={moveStage} fields={{ id: s.id, direction: "up" }} variant="ghost" title="Move up"><ArrowUp className={`size-4 ${i === 0 ? "opacity-30" : ""}`} /></ActionButton>
                <ActionButton action={moveStage} fields={{ id: s.id, direction: "down" }} variant="ghost" title="Move down"><ArrowDown className={`size-4 ${i === stages.length - 1 ? "opacity-30" : ""}`} /></ActionButton>
                {!s.is_default && !s.is_won && !s.is_lost && s.is_active && <ActionButton action={setDefaultStage} fields={{ id: s.id }} variant="ghost" title="Make default for new leads"><Star className="size-4" /></ActionButton>}
                <Modal title={`Edit “${s.name}”`} trigger={<Pencil className="size-4" />} triggerClassName={buttonClass("ghost", "sm")} size="sm">
                  <CrmForm action={saveStage} submitLabel="Save stage"><StageFields stage={s} /></CrmForm>
                </Modal>
                {!s.is_default && <ConfirmButton action={deleteStage} fields={{ id: s.id }} title={`Delete “${s.name}”?`} message="Only empty stages can be deleted. Hide it instead to keep history." confirmLabel="Delete"><Trash2 className="size-4" /></ConfirmButton>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type OptionRow = { id: string; key: string; label: string; color: string | null; is_active: boolean };

export function OptionsManager({ kind, label, options, editable, withColor }: { kind: string; label: string; options: OptionRow[]; editable: boolean; withColor: boolean }) {
  return (
    <div className="space-y-3">
      {editable && (
        <CrmForm action={saveOption} submitLabel={`Add ${label.toLowerCase()}`} resetOnSuccess className="rounded-2xl border border-line bg-white p-4">
          <input type="hidden" name="kind" value={kind} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <TextField label={`New ${label.toLowerCase()}`} name="label" required />
            {withColor && <TextField label="Colour" name="color" type="color" defaultValue="#3b82f6" />}
          </div>
        </CrmForm>
      )}
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {options.map((o) => (
          <li key={o.id} className="flex items-center gap-3 px-4 py-2.5">
            {withColor && <span className="size-3.5 rounded-full" style={{ backgroundColor: o.color ?? "#94a3b8" }} />}
            <div className="min-w-0 flex-1">
              <p className={o.is_active ? "font-medium" : "font-medium text-muted line-through"}>{o.label}</p>
              <p className="font-mono text-[11px] text-muted">{o.key}</p>
            </div>
            {editable && (
              <div className="flex items-center gap-0.5">
                <Modal title={`Edit “${o.label}”`} trigger={<Pencil className="size-4" />} triggerClassName={buttonClass("ghost", "sm")} size="sm">
                  <CrmForm action={saveOption} submitLabel="Save">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="kind" value={kind} />
                    <TextField label="Label" name="label" required defaultValue={o.label} />
                    {withColor && <TextField label="Colour" name="color" type="color" defaultValue={o.color ?? "#3b82f6"} />}
                    <CheckboxField name="is_active" label="Active (available in forms)" defaultChecked={o.is_active} />
                    <p className="text-xs text-muted">The stored key <code>{o.key}</code> doesn&apos;t change, so existing records keep this option.</p>
                  </CrmForm>
                </Modal>
                <ConfirmButton action={deleteOption} fields={{ id: o.id }} title={`Delete “${o.label}”?`} message="Options in use can't be deleted — deactivate them instead." confirmLabel="Delete"><Trash2 className="size-4" /></ConfirmButton>
              </div>
            )}
          </li>
        ))}
        {!options.length && <li className="px-4 py-6 text-center text-sm text-muted">No options yet.</li>}
      </ul>
    </div>
  );
}

type FieldRow = { id: string; entity: string; label: string; key: string; field_type: string; options: string[]; is_required: boolean; is_active: boolean };

function CustomFieldFields({ field }: { field?: FieldRow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field && <input type="hidden" name="id" value={field.id} />}
      {field ? <input type="hidden" name="entity" value={field.entity} /> : (
        <SelectField label="Applies to" name="entity" allowEmpty={false} options={[{ value: "lead", label: "Leads" }, { value: "customer", label: "Customers" }, { value: "application", label: "Visa applications" }]} />
      )}
      <TextField label="Field label" name="label" required defaultValue={field?.label} />
      <SelectField label="Field type" name="field_type" allowEmpty={false} defaultValue={field?.field_type ?? "text"} options={[
        { value: "text", label: "Short text" }, { value: "textarea", label: "Long text" }, { value: "number", label: "Number" },
        { value: "date", label: "Date" }, { value: "select", label: "Dropdown" }, { value: "checkbox", label: "Yes / No" },
      ]} />
      <TextAreaField label="Dropdown options (one per line)" name="options" defaultValue={field?.options.join("\n")} rows={3} hint="Only for dropdown fields" />
      <CheckboxField name="is_required" label="Required" defaultChecked={field?.is_required} />
      {field && <CheckboxField name="is_active" label="Active" defaultChecked={field.is_active} />}
    </div>
  );
}

export function CustomFieldsManager({ fields, editable }: { fields: FieldRow[]; editable: boolean }) {
  const groups = [{ key: "lead", label: "Leads" }, { key: "customer", label: "Customers" }, { key: "application", label: "Visa applications" }];
  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex justify-end">
          <Modal title="Add custom field" trigger={<><Plus className="size-4" />Add field</>}>
            <CrmForm action={saveCustomField} submitLabel="Add field"><CustomFieldFields /></CrmForm>
          </Modal>
        </div>
      )}
      {groups.map((g) => {
        const list = fields.filter((f) => f.entity === g.key);
        return (
          <section key={g.key} className="rounded-2xl border border-line bg-white">
            <h3 className="border-b border-line px-4 py-3 font-semibold">{g.label}</h3>
            <ul className="divide-y divide-line">
              {list.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className={f.is_active ? "font-medium" : "font-medium text-muted line-through"}>{f.label}{f.is_required && <span className="text-danger"> *</span>}</p>
                    <p className="text-xs text-muted">{f.field_type}{f.options.length ? ` · ${f.options.join(", ")}` : ""}</p>
                  </div>
                  {editable && (
                    <div className="flex gap-0.5">
                      <Modal title={`Edit “${f.label}”`} trigger={<Pencil className="size-4" />} triggerClassName={buttonClass("ghost", "sm")}>
                        <CrmForm action={saveCustomField} submitLabel="Save field"><CustomFieldFields field={f} /></CrmForm>
                      </Modal>
                      <ConfirmButton action={deleteCustomField} fields={{ id: f.id }} title={`Delete “${f.label}”?`} message="The field disappears from forms. Values already saved stay on the records." confirmLabel="Delete"><Trash2 className="size-4" /></ConfirmButton>
                    </div>
                  )}
                </li>
              ))}
              {!list.length && <li className="px-4 py-5 text-center text-sm text-muted">No custom fields.</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function ProfileForm({ name, mobile }: { name: string; mobile: string | null }) {
  return (
    <CrmForm action={updateOwnProfile} submitLabel="Save profile">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" name="full_name" required defaultValue={name} />
        <TextField label="Mobile" name="mobile" type="tel" defaultValue={mobile} />
        <FileField label="Profile picture" name="avatar" accept="image/jpeg,image/png,image/webp" hint="JPG, PNG or WebP, up to 2 MB" className="sm:col-span-2" />
      </div>
    </CrmForm>
  );
}

export function ChangePasswordForm() {
  return (
    <CrmForm action={crmChangePassword} submitLabel="Change password" resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Current password" name="currentPassword" type="password" required autoComplete="current-password" />
        <TextField label="New password" name="password" type="password" required autoComplete="new-password" hint="10+ characters, letters and numbers" />
        <TextField label="Confirm new password" name="confirmPassword" type="password" required autoComplete="new-password" />
      </div>
    </CrmForm>
  );
}

export function SignOutOthers() {
  return <ActionButton action={crmSignOutOthers} fields={{}} variant="secondary">Sign out all other devices</ActionButton>;
}
