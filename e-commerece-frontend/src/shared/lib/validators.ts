// Quick checks run in the browser before sending a form (the server checks everything again).
// An email needs something before and after one @, and a dot in the part after it.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits, spaces, brackets and dashes, with an optional leading + (same rule as the server)
export const PHONE_PATTERN = /^\+?[0-9 ()-]{6,24}$/;
