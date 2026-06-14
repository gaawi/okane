// Pure icon helpers — no React, safe to import on the server.
// We store a short, stable "icon key" on each category; the matching
// lucide component lives in components/icons.tsx.

export const ICON_KEYS = [
  "wallet",
  "shopping-cart",
  "shopping-bag",
  "utensils",
  "car",
  "home",
  "plug",
  "lightbulb",
  "repeat",
  "credit-card",
  "banknote",
  "piggy-bank",
  "trending-up",
  "arrows",
  "receipt",
  "landmark",
  "heart-pulse",
  "stethoscope",
  "plane",
  "film",
  "gift",
  "gamepad",
  "graduation-cap",
  "briefcase",
  "laptop",
  "phone",
  "sparkles",
  "heart",
  "paw",
  "fuel",
  "coffee",
  "baby",
  "dumbbell",
  "circle-help",
  "tag",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

const RULES: Array<[RegExp, IconKey]> = [
  [/salary|payroll|income|deposit|interest|paycheck|reimburs|refund/, "wallet"],
  [/grocer|supermarket|market|food market|key food|trader|whole foods/, "shopping-cart"],
  [/dining|restaurant|drink|coffee|cafe|bar|juice|eat/, "utensils"],
  [/auto|transport|transit|uber|lyft|taxi|ferry|train|metro|parking|toll/, "car"],
  [/fuel|gas station|petrol/, "fuel"],
  [/rent|housing|mortgage|home|garden|furnit/, "home"],
  [/util|electric|water|power|energy/, "plug"],
  [/bill|phone|mobile|internet|cable/, "phone"],
  [/subscri|recurring|membership/, "repeat"],
  [/credit card payment|card payment/, "credit-card"],
  [/internal transfer|transfer|move money/, "arrows"],
  [/saving|emergency fund|safety net|vacation fund|buy car|goal/, "piggy-bank"],
  [/invest|stock|brokerage|robinhood|dividend/, "trending-up"],
  [/fee|charge|interest charge|service charge/, "receipt"],
  [/tax/, "landmark"],
  [/cash|check|atm|withdrawal/, "banknote"],
  [/health|wellness|medical|doctor|pharmac|dental/, "heart-pulse"],
  [/shopping|retail|amazon|store|clothes|apparel/, "shopping-bag"],
  [/software|tech|app|saas|cloud|hosting/, "laptop"],
  [/entertain|movie|music|stream|netflix|spotify|game|recreation/, "film"],
  [/travel|vacation|flight|hotel|airbnb|trip/, "plane"],
  [/gift|present|donation|charit/, "gift"],
  [/educat|teach|school|course|tuition|class/, "graduation-cap"],
  [/business|gastos|creartbox|office|work/, "briefcase"],
  [/personal care|beauty|salon|spa|barber/, "sparkles"],
  [/pet|paw|vet/, "paw"],
  [/gym|fitness|sport|workout/, "dumbbell"],
  [/baby|child|kid|daycare/, "baby"],
  [/uncategor/, "circle-help"],
];

/** Pick a sensible icon key from a category name. */
export function inferIconKey(name: string): IconKey {
  const n = (name || "").toLowerCase();
  for (const [re, key] of RULES) {
    if (re.test(n)) return key;
  }
  return "tag";
}

const VALID = new Set<string>(ICON_KEYS);

/** Resolve a category's display icon key: stored key if valid, else inferred. */
export function resolveIconKey(stored: string | null | undefined, name: string): IconKey {
  if (stored && VALID.has(stored)) return stored as IconKey;
  return inferIconKey(name);
}
