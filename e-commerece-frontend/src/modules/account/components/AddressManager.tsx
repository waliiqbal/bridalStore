"use client";

import { FormError } from "@/shared/components/FormError";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LuMapPin, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { Badge } from "@/shared/admin/Layout";
import { countryName } from "@/shared/lib/countries";
import { createAddress, deleteAddress, makeDefaultAddress, updateAddress } from "../api/account.api";
import type { Address, AddressInput } from "../types/account";
import {
  AddressFields,
  cleanAddress,
  EMPTY_ADDRESS,
  validateAddress,
  type AddressErrors,
} from "./AddressFields";

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  // `null` = closed, "new" = adding, otherwise the address being changed
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await action();
      setConfirmingDelete(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="addresses-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="addresses-heading" className="font-serif text-2xl font-bold">
          Addresses
        </h2>
        {editing === null && (
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" />
            Add an address
          </Button>
        )}
      </div>

      {error && (
        <FormError className="mb-4">
          {error}
        </FormError>
      )}

      {editing !== null && (
        <AddressForm
          // A fresh form each time it opens
          key={editing === "new" ? "new" : editing.id}
          address={editing === "new" ? null : editing}
          isFirst={addresses.length === 0}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {addresses.length === 0 && editing === null && (
        <div className="rounded-sm border border-dashed border-line bg-cream/50 px-6 py-14 text-center">
          <LuMapPin className="mx-auto h-10 w-10 text-gold" aria-hidden />
          <p className="mt-3 font-serif text-xl font-bold">No saved addresses</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            Save an address here and checkout will be quicker.
          </p>
        </div>
      )}

      {addresses.length > 0 && (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col rounded-sm border border-line bg-white p-4 sm:p-5">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {a.fullName}
                {a.isDefault && <Badge tone="gold">Default</Badge>}
              </p>
              <address className="mt-2 flex-1 text-sm not-italic leading-relaxed text-muted">
                {a.line1}
                {a.line2 && (
                  <>
                    <br />
                    {a.line2}
                  </>
                )}
                <br />
                {[a.city, a.state, a.postcode].filter(Boolean).join(" ")}
                <br />
                {countryName(a.countryCode)}
                {a.phone && (
                  <>
                    <br />
                    {a.phone}
                  </>
                )}
              </address>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Button size="sm" variant="secondary" onClick={() => setEditing(a)}>
                  <LuPencil className="h-4 w-4" />
                  Edit
                </Button>
                {!a.isDefault && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === a.id}
                    onClick={() => run(a.id, () => makeDefaultAddress(a.id))}
                  >
                    Make default
                  </Button>
                )}
                {confirmingDelete === a.id ? (
                  <span className="ml-auto flex items-center gap-2 text-sm">
                    Delete this address?
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busy === a.id}
                      onClick={() => run(a.id, () => deleteAddress(a.id))}
                    >
                      Yes, delete
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmingDelete(null)}>
                      No
                    </Button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(a.id)}
                    aria-label={`Delete the address for ${a.fullName}, ${a.line1}`}
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type FieldErrors = AddressErrors & { form?: string };

function AddressForm({
  address,
  isFirst,
  onCancel,
  onSaved,
}: {
  address: Address | null;
  isFirst: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AddressInput>(
    address
      ? {
          fullName: address.fullName,
          phone: address.phone ?? "",
          line1: address.line1,
          line2: address.line2 ?? "",
          city: address.city,
          state: address.state ?? "",
          postcode: address.postcode,
          countryCode: address.countryCode,
          isDefault: address.isDefault,
        }
      : { ...EMPTY_ADDRESS, isDefault: isFirst },
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AddressInput>(key: K, value: AddressInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    const found: FieldErrors = validateAddress(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = { ...cleanAddress(form), isDefault: form.isDefault };
    setSaving(true);
    try {
      if (address) await updateAddress(address.id, body);
      else await createAddress(body);
      onSaved();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong. Please try again." });
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      noValidate
      className="space-y-5 rounded-sm border border-gold/60 bg-white p-4 sm:p-6"
    >
      <h3 className="font-serif text-xl font-bold">{address ? "Edit address" : "Add an address"}</h3>
      <AddressFields value={form} onChange={set} errors={errors} />
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={!!form.isDefault}
          disabled={isFirst || address?.isDefault}
          onChange={(event) => set("isDefault", event.target.checked)}
          className="h-5 w-5 accent-black"
        />
        Use this as my default address
      </label>
      {errors.form && (
        <FormError>
          {errors.form}
        </FormError>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save address
        </Button>
      </div>
    </form>
  );
}
