"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { notifyInApp } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { can, crmAudit, crmAuthorize, dbErrorMessage, DENIED, diff, FAILED, INVALID } from "../auth";
import { getCrmConfig } from "../config";
import { removePrivateFiles, storePrivateFile } from "../files";
import { formValues, nullify, optText, optUuid, positiveMoney, reqText } from "../schemas";

const KEYS = ["title", "category", "amount", "expense_date", "payment_mode", "vendor", "lead_id", "customer_id", "application_id", "description"];
const schema = z.object({
  title: reqText("Expense title", 200).pipe(z.string().min(2, "Enter a title")),
  category: reqText("Category", 60),
  amount: positiveMoney,
  expense_date: z.string({ error: "Pick the expense date" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the expense date"),
  payment_mode: optText(60),
  vendor: optText(160),
  lead_id: optUuid,
  customer_id: optUuid,
  application_id: optUuid,
  description: optText(2000),
});

async function validLinks(d: z.infer<typeof schema>) {
  const config = await getCrmConfig();
  if (!config.options.expense_category.some((o) => o.key === d.category)) return { category: "Choose a category" };
  return null;
}

export async function createExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("expenses.create");
  if (!viewer) return DENIED;
  const parsed = schema.safeParse(formValues(formData, KEYS));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const bad = await validLinks(parsed.data);
  if (bad) return { ...INVALID, fieldErrors: bad };

  const bill = await storePrivateFile(formData.get("bill"), "expenses");
  if (!bill.ok) return { status: "error", fieldErrors: { bill: bill.error }, message: bill.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_expenses")
    .insert({ ...nullify(parsed.data), bill_path: bill.file?.path ?? null, added_by: viewer.id, status: "pending" })
    .select("id, code")
    .single();
  if (error || !data) {
    await removePrivateFiles([bill.file?.path]);
    return { status: "error", message: dbErrorMessage(error) };
  }
  // Approvers can approve their own entry immediately.
  if (formData.get("approve_now") === "on" && can(viewer, "expenses.approve")) {
    await supabase.from("crm_expenses").update({ status: "approved", approval_remarks: "Approved on entry" }).eq("id", data.id);
  } else if ((await getCrmConfig()).notifications.expense_submitted !== false) {
    // Let approvers know (best effort, in-app).
    const [{ data: grants }, { data: supers }] = await Promise.all([
      supabase.from("crm_role_permissions").select("role_id").eq("permission", "expenses.approve"),
      supabase.from("crm_roles").select("id").eq("is_super", true),
    ]);
    const roleIds = [...(grants ?? []).map((g) => g.role_id), ...(supers ?? []).map((r) => r.id)];
    if (roleIds.length) {
      const { data: people } = await supabase.from("profiles").select("id").in("crm_role_id", roleIds).eq("crm_active", true).neq("id", viewer.id).limit(25);
      await Promise.all((people ?? []).map((p) => notifyInApp(p.id, "application_updated", { expense: data.code, crm: true, title: "Expense awaiting approval" })));
    }
  }
  await crmAudit(viewer, "expense.added", "expenses", data.id, { ...parsed.data, code: data.code });
  revalidatePath("/crm/expenses");
  return { status: "success", message: `Expense ${data.code} added.` };
}

export async function updateExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("expenses.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const parsed = schema.safeParse(formValues(formData, KEYS));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const bad = await validLinks(parsed.data);
  if (bad) return { ...INVALID, fieldErrors: bad };
  const supabase = await createClient();
  const { data: before } = await supabase.from("crm_expenses").select("*").eq("id", id.data).maybeSingle();
  if (!before) return DENIED;
  if (before.status === "approved" && !can(viewer, "expenses.approve")) return { status: "error", message: "Approved expenses can only be changed by an approver." };

  const bill = await storePrivateFile(formData.get("bill"), "expenses");
  if (!bill.ok) return { status: "error", fieldErrors: { bill: bill.error }, message: bill.error };
  const row: Record<string, unknown> = nullify(parsed.data);
  if (bill.file) row.bill_path = bill.file.path;
  const { error } = await supabase.from("crm_expenses").update(row).eq("id", id.data);
  if (error) {
    await removePrivateFiles([bill.file?.path]);
    return { status: "error", message: dbErrorMessage(error) };
  }
  if (bill.file && before.bill_path) await removePrivateFiles([before.bill_path]);
  await crmAudit(viewer, "expense.updated", "expenses", id.data, diff(before, row));
  revalidatePath("/crm/expenses");
  return { status: "success", message: "Expense updated." };
}

export async function decideExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("expenses.approve");
  if (!viewer) return DENIED;
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["approved", "rejected", "pending"]), remarks: optText(1000) })
    .refine((v) => v.status !== "rejected" || !!v.remarks, { path: ["remarks"], message: "Give a reason for rejecting" })
    .safeParse({ ...formValues(formData, ["id", "status"]), remarks: formValues(formData, ["remarks"]).remarks ?? formValues(formData, ["reason"]).reason });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  const supabase = await createClient();
  const { data: before } = await supabase.from("crm_expenses").select("id, code, status, added_by").eq("id", parsed.data.id).maybeSingle();
  if (!before) return DENIED;
  if (before.status === parsed.data.status) return { status: "success", message: "No change." };
  const { error } = await supabase.from("crm_expenses").update({ status: parsed.data.status, approval_remarks: parsed.data.remarks ?? null }).eq("id", parsed.data.id);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (before.added_by && before.added_by !== viewer.id && (await getCrmConfig()).notifications.expense_decided !== false) {
    await notifyInApp(before.added_by, "application_updated", { expense: before.code, status: parsed.data.status, crm: true, title: `Expense ${parsed.data.status}` });
  }
  await crmAudit(viewer, `expense.${parsed.data.status}`, "expenses", parsed.data.id, { from: before.status, to: parsed.data.status, remarks: parsed.data.remarks });
  revalidatePath("/crm/expenses");
  return { status: "success", message: parsed.data.status === "approved" ? `${before.code} approved.` : parsed.data.status === "rejected" ? `${before.code} rejected.` : `${before.code} moved back to pending.` };
}

export async function deleteExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("expenses.delete");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: e } = await supabase.from("crm_expenses").select("*").eq("id", id.data).maybeSingle();
  if (!e) return DENIED;
  if (e.status === "approved" && !can(viewer, "expenses.approve")) return { status: "error", message: "Approved expenses can only be deleted by an approver." };
  const { error } = await supabase.from("crm_expenses").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await removePrivateFiles([e.bill_path]);
  await crmAudit(viewer, "expense.deleted", "expenses", id.data, { ...e, reason: formData.get("reason") || null });
  revalidatePath("/crm/expenses");
  return { status: "success", message: `${e.code} deleted.` };
}
