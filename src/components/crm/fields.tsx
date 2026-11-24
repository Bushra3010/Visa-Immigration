"use client";

import type { ReactNode } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { cn } from "@/lib/utils";
import { useFieldError } from "./interactive";

type Opt = { value: string; label: string };

export function TextField({ label, name, defaultValue, type = "text", required, placeholder, hint, className, ...rest }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string; hint?: string; className?: string;
  min?: string | number; max?: string | number; step?: string; autoComplete?: string; maxLength?: number; readOnly?: boolean;
}) {
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={`f-${name}`} error={error} hint={hint} required={required} className={className}>
      <Input id={`f-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} placeholder={placeholder}
        aria-invalid={error ? true : undefined} {...rest} />
    </Field>
  );
}

export function SelectField({ label, name, options, defaultValue, placeholder = "Select…", required, hint, className, allowEmpty = true }: {
  label: string; name: string; options: Opt[]; defaultValue?: string | null; placeholder?: string; required?: boolean; hint?: string; className?: string; allowEmpty?: boolean;
}) {
  const error = useFieldError(name);
  const known = !defaultValue || options.some((o) => o.value === defaultValue);
  return (
    <Field label={label} htmlFor={`f-${name}`} error={error} hint={hint} required={required} className={className}>
      <Select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} aria-invalid={error ? true : undefined}>
        {allowEmpty && <option value="">{placeholder}</option>}
        {!known && <option value={defaultValue!}>{defaultValue}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </Field>
  );
}

export function TextAreaField({ label, name, defaultValue, rows = 3, required, placeholder, hint, className, maxLength }: {
  label: string; name: string; defaultValue?: string | null; rows?: number; required?: boolean; placeholder?: string; hint?: string; className?: string; maxLength?: number;
}) {
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={`f-${name}`} error={error} hint={hint} required={required} className={className}>
      <Textarea id={`f-${name}`} name={name} rows={rows} defaultValue={defaultValue ?? ""} placeholder={placeholder} maxLength={maxLength} aria-invalid={error ? true : undefined} />
    </Field>
  );
}

export function CheckboxField({ label, name, defaultChecked, hint, value = "on" }: { label: ReactNode; name: string; defaultChecked?: boolean; hint?: string; value?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="mt-0.5 size-4 shrink-0 accent-brand-600" />
      <span>{label}{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
    </label>
  );
}

export function FileField({ label, name, accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png", required, hint = "PDF, JPG or PNG, up to 10 MB", className, multiple }: {
  label: string; name: string; accept?: string; required?: boolean; hint?: string; className?: string; multiple?: boolean;
}) {
  const error = useFieldError(name);
  return (
    <Field label={label} htmlFor={`f-${name}`} error={error} hint={hint} required={required} className={className}>
      <input id={`f-${name}`} name={name} type="file" accept={accept} multiple={multiple}
        className="block w-full rounded-lg border border-line bg-white text-sm text-ink-soft file:mr-3 file:h-10 file:border-0 file:bg-brand-50 file:px-3 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100" />
    </Field>
  );
}

export function FormSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("rounded-xl border border-line bg-white p-4 sm:p-5", className)}>
      <legend className="sr-only">{title}</legend>
      <div className="mb-4">
        <h3 className="font-semibold text-ink">{title}</h3>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export type CustomFieldDef = { key: string; label: string; field_type: string; options: string[]; is_required: boolean };

/** Admin-defined fields (CRM → Settings → Custom fields). Submitted as cf_<key>. */
export function CustomFieldInputs({ fields, values }: { fields: CustomFieldDef[]; values?: Record<string, unknown> | null }) {
  if (!fields.length) return null;
  return (
    <>
      {fields.map((f) => {
        const name = `cf_${f.key}`;
        const v = values?.[f.key];
        if (f.field_type === "textarea") return <TextAreaField key={f.key} label={f.label} name={name} defaultValue={v as string} required={f.is_required} className="sm:col-span-2" />;
        if (f.field_type === "select") return <SelectField key={f.key} label={f.label} name={name} defaultValue={v as string} required={f.is_required} options={f.options.map((o) => ({ value: o, label: o }))} />;
        if (f.field_type === "checkbox") return <div key={f.key} className="flex items-end pb-2"><CheckboxField label={f.label} name={name} defaultChecked={v === true} /></div>;
        return <TextField key={f.key} label={f.label} name={name} type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"} defaultValue={v as string} required={f.is_required} />;
      })}
    </>
  );
}
