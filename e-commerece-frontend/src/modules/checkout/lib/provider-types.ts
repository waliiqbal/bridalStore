// The small part of each payment provider's browser script that we use. (The providers ship
// their own scripts; these describe just the calls we make, so the code stays type-checked.)

export interface StripeElement {
  mount(target: HTMLElement): void;
  destroy(): void;
}
export interface StripeElements {
  create(type: "payment"): StripeElement;
}
export interface StripeInstance {
  elements(options: { clientSecret: string }): StripeElements;
  confirmPayment(args: {
    elements: StripeElements;
    confirmParams: { return_url: string };
    redirect: "if_required";
  }): Promise<{ error?: { message?: string } }>;
}

export interface SquareCard {
  attach(target: HTMLElement): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy(): Promise<void>;
}
export interface SquarePayments {
  card(): Promise<SquareCard>;
  verifyBuyer(token: string, details: object): Promise<{ token: string } | null | undefined>;
}

export interface PayPalButtonsOptions {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: (error: unknown) => void;
  onCancel: () => void;
}
export interface PayPalSdk {
  Buttons(options: PayPalButtonsOptions): {
    render(target: HTMLElement): Promise<void>;
    close(): Promise<void>;
  };
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
    Square?: {
      payments(applicationId: string, locationId: string): SquarePayments | Promise<SquarePayments>;
    };
    paypal?: PayPalSdk;
  }
}

export {};
