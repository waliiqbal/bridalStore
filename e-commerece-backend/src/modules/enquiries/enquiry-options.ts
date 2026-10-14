// The choices on the enquiry form. The website shows the labels; the database keeps the codes.

export const BUDGET_OPTIONS = [
  { code: 'UNDER_1000', label: 'Under $1,000' },
  { code: '1000_2000', label: '$1,000 – $2,000' },
  { code: '2000_3500', label: '$2,000 – $3,500' },
  { code: '3500_5000', label: '$3,500 – $5,000' },
  { code: 'OVER_5000', label: 'Over $5,000' },
  { code: 'NOT_SURE', label: 'Not sure yet' },
] as const;

export const OUTFIT_TYPE_OPTIONS = [
  { code: 'LEHENGA', label: 'Bridal lehenga' },
  { code: 'GHARARA', label: 'Gharara' },
  { code: 'SHARARA', label: 'Sharara' },
  { code: 'MAXI', label: 'Maxi / gown' },
  { code: 'ANARKALI', label: 'Anarkali / frock' },
  { code: 'SAREE', label: 'Saree' },
  { code: 'KURTA_SET', label: 'Kurta set' },
  { code: 'MENSWEAR', label: 'Menswear (groom)' },
  { code: 'NOT_SURE', label: 'Not sure yet' },
] as const;

export const BUDGET_CODES: string[] = BUDGET_OPTIONS.map((o) => o.code);
export const OUTFIT_TYPE_CODES: string[] = OUTFIT_TYPE_OPTIONS.map((o) => o.code);
