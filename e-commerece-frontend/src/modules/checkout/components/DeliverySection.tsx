"use client";

import { countryName } from "@/shared/lib/countries";
import { AddressFields, type AddressErrors } from "@/modules/account/components/AddressFields";
import type { Address, AddressInput } from "@/modules/account/types/account";

export const NEW_ADDRESS = "new";

// Step 2: where to send it. A signed-in customer can pick a saved address or type a new one.
export function DeliverySection({
  saved,
  choice,
  onChoice,
  address,
  onAddressChange,
  errors,
}: {
  saved: Address[];
  // The id of a saved address, or NEW_ADDRESS
  choice: string;
  onChoice: (value: string) => void;
  address: AddressInput;
  onAddressChange: <K extends keyof AddressInput>(key: K, value: AddressInput[K]) => void;
  errors: AddressErrors;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 font-serif text-xl font-bold">Delivery address</legend>

      {saved.length > 0 && (
        <div className="space-y-2" role="radiogroup" aria-label="Choose an address">
          {saved.map((a) => (
            <label
              key={a.id}
              className={`flex cursor-pointer items-start gap-3 rounded-sm border px-4 py-3 text-sm ${
                choice === a.id ? "border-black" : "border-line hover:border-gold"
              }`}
            >
              <input
                type="radio"
                name="delivery-address"
                checked={choice === a.id}
                onChange={() => onChoice(a.id)}
                className="mt-1 h-4 w-4 accent-black"
              />
              <span>
                <span className="font-medium">{a.fullName}</span>
                <span className="block text-muted">
                  {[a.line1, a.line2, a.city, a.state, a.postcode].filter(Boolean).join(", ")},{" "}
                  {countryName(a.countryCode)}
                </span>
              </span>
            </label>
          ))}
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm ${
              choice === NEW_ADDRESS ? "border-black" : "border-line hover:border-gold"
            }`}
          >
            <input
              type="radio"
              name="delivery-address"
              checked={choice === NEW_ADDRESS}
              onChange={() => onChoice(NEW_ADDRESS)}
              className="h-4 w-4 accent-black"
            />
            Use a different address
          </label>
        </div>
      )}

      {choice === NEW_ADDRESS && (
        <div className="space-y-5">
          <AddressFields value={address} onChange={onAddressChange} errors={errors} idPrefix="ship" />
        </div>
      )}
    </fieldset>
  );
}
