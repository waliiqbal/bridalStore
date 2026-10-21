import { apiFetch } from "@/infrastructure/http/api-client";
import type { Address, AddressInput, Customer } from "../types/account";

// Browser-side calls for the shopper (the login cookie is sent automatically).

export const login = (email: string, password: string) =>
  apiFetch<{ customer: Customer }>("/auth/login", { method: "POST", body: { email, password } });

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  marketingOptIn?: boolean;
}

// "CREATED" = signed in. "CHECK_EMAIL" = they had ordered as a guest, so we emailed a link
// to finish creating the account (nobody can claim someone else's orders by typing their email).
export const register = (input: RegisterInput) =>
  apiFetch<{ status: "CREATED" | "CHECK_EMAIL"; message?: string }>("/auth/register", {
    method: "POST",
    body: input,
  });

export const logout = () => apiFetch<{ success: true }>("/auth/logout", { method: "POST" });

export const forgotPassword = (email: string) =>
  apiFetch<{ success: true; message: string }>("/auth/forgot-password", { method: "POST", body: { email } });

// Also used by the "finish creating your account" email link
export const resetPassword = (token: string, password: string) =>
  apiFetch<{ success: true; message: string }>("/auth/reset-password", {
    method: "POST",
    body: { token, password },
  });

export const updateProfile = (changes: {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  marketingOptIn?: boolean;
}) => apiFetch<Customer>("/account/profile", { method: "PATCH", body: changes });

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<{ success: true }>("/account/password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });

export const listAddresses = () => apiFetch<Address[]>("/account/addresses");

export const createAddress = (input: AddressInput) =>
  apiFetch<Address>("/account/addresses", { method: "POST", body: input });

export const updateAddress = (id: string, input: Partial<AddressInput>) =>
  apiFetch<Address>(`/account/addresses/${id}`, { method: "PATCH", body: input });

export const makeDefaultAddress = (id: string) =>
  apiFetch<Address>(`/account/addresses/${id}/default`, { method: "POST" });

export const deleteAddress = (id: string) =>
  apiFetch<{ deleted: true }>(`/account/addresses/${id}`, { method: "DELETE" });

export const saveToWishlist = (productId: string) =>
  apiFetch<{ productId: string; saved: true }>("/account/wishlist", { method: "POST", body: { productId } });

export const removeFromWishlist = (productId: string) =>
  apiFetch<{ productId: string; saved: false }>(`/account/wishlist/${productId}`, { method: "DELETE" });
