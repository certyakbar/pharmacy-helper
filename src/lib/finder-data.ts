export type SymptomId =
  | "sneezing"
  | "runny-nose"
  | "blocked-nose"
  | "itchy-nose"
  | "itchy-eyes"
  | "watery-eyes";

export type CategoryId = "tablets" | "nasal-sprays" | "eye-drops";

export type StockStatus = "in-stock" | "low-stock" | "ask-staff";

export interface Symptom {
  id: SymptomId;
  label: string;
  description: string;
  icon: string; // lucide icon name
}

export interface Category {
  id: CategoryId;
  name: string;
  blurb: string;
  symptoms: SymptomId[];
  icon: string;
}

export interface Product {
  id: string;
  sku: string;
  gtin: string;
  productName: string;
  activeIngredient: string;
  formulation: string;
  packSize: string;
  category: CategoryId;
  symptoms: SymptomId[];
  price: number;
  stockStatus: StockStatus;
  stockQuantity: number;
  aisle: number;
  bay: number;
  shelf: number;
  image: string; // emoji / placeholder token
  badges: string[]; // difference labels
  drowsiness: "none" | "low" | "possible";
  requiresStaffHelp: boolean;
  disclaimer: string;
}

export const SYMPTOMS: Symptom[] = [
  { id: "sneezing", label: "Sneezing", description: "Frequent, repeated sneezes", icon: "Wind" },
  { id: "runny-nose", label: "Runny nose", description: "Clear nasal discharge", icon: "Droplet" },
  { id: "blocked-nose", label: "Blocked nose", description: "Congestion, hard to breathe", icon: "Ban" },
  { id: "itchy-nose", label: "Itchy nose", description: "Tickly, irritated nose", icon: "Sparkles" },
  { id: "itchy-eyes", label: "Itchy eyes", description: "Rubbing, gritty feeling", icon: "Eye" },
  { id: "watery-eyes", label: "Watery eyes", description: "Excess tears, streaming", icon: "CloudDrizzle" },
];

export const CATEGORIES: Category[] = [
  {
    id: "tablets",
    name: "Tablets",
    blurb: "Whole-body antihistamines that help calm sneezing, itching and runny nose.",
    symptoms: ["sneezing", "runny-nose", "itchy-nose", "itchy-eyes"],
    icon: "Pill",
  },
  {
    id: "nasal-sprays",
    name: "Nasal sprays",
    blurb: "Targeted relief for congestion, itching and a runny nose.",
    symptoms: ["blocked-nose", "runny-nose", "itchy-nose", "sneezing"],
    icon: "SprayCan",
  },
  {
    id: "eye-drops",
    name: "Eye drops",
    blurb: "Soothe itchy, watery and irritated eyes at the source.",
    symptoms: ["itchy-eyes", "watery-eyes"],
    icon: "Eye",
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "p01", sku: "TAB-CET-10", gtin: "5000000000011",
    productName: "Cetirizine 10 mg Tablets",
    activeIngredient: "Cetirizine hydrochloride 10 mg",
    formulation: "Film-coated tablet",
    packSize: "30 tablets",
    category: "tablets",
    symptoms: ["sneezing", "runny-nose", "itchy-nose", "itchy-eyes"],
    price: 3.49,
    stockStatus: "in-stock", stockQuantity: 42,
    aisle: 4, bay: 2, shelf: 3,
    image: "💊",
    badges: ["Once daily", "Non-drowsy for most"],
    drowsiness: "low",
    requiresStaffHelp: false,
    disclaimer: "Adults and children 6+. Read the label before use.",
  },
  {
    id: "p02", sku: "TAB-LOR-10", gtin: "5000000000028",
    productName: "Loratadine 10 mg Tablets",
    activeIngredient: "Loratadine 10 mg",
    formulation: "Tablet",
    packSize: "30 tablets",
    category: "tablets",
    symptoms: ["sneezing", "runny-nose", "itchy-nose", "itchy-eyes"],
    price: 2.99,
    stockStatus: "in-stock", stockQuantity: 51,
    aisle: 4, bay: 2, shelf: 3,
    image: "💊",
    badges: ["Once daily", "Non-drowsy"],
    drowsiness: "none",
    requiresStaffHelp: false,
    disclaimer: "Adults and children 2+. Read the label before use.",
  },
  {
    id: "p03", sku: "TAB-CHL-4", gtin: "5000000000035",
    productName: "Chlorphenamine 4 mg Tablets",
    activeIngredient: "Chlorphenamine maleate 4 mg",
    formulation: "Tablet",
    packSize: "28 tablets",
    category: "tablets",
    symptoms: ["sneezing", "runny-nose", "itchy-nose", "itchy-eyes"],
    price: 2.19,
    stockStatus: "in-stock", stockQuantity: 22,
    aisle: 4, bay: 2, shelf: 2,
    image: "💊",
    badges: ["Fast acting", "May cause drowsiness"],
    drowsiness: "possible",
    requiresStaffHelp: false,
    disclaimer: "Do not drive after taking. Adults and children 6+.",
  },
  {
    id: "p04", sku: "TAB-FEX-120", gtin: "5000000000042",
    productName: "Fexofenadine 120 mg Tablets",
    activeIngredient: "Fexofenadine hydrochloride 120 mg",
    formulation: "Film-coated tablet",
    packSize: "30 tablets",
    category: "tablets",
    symptoms: ["sneezing", "runny-nose", "itchy-nose", "itchy-eyes"],
    price: 6.99,
    stockStatus: "low-stock", stockQuantity: 4,
    aisle: 4, bay: 2, shelf: 3,
    image: "💊",
    badges: ["Once daily", "Non-drowsy"],
    drowsiness: "none",
    requiresStaffHelp: false,
    disclaimer: "Adults and children 12+. Read the label before use.",
  },
  {
    id: "p05", sku: "NSP-BEC-50", gtin: "5000000000059",
    productName: "Beclometasone Nasal Spray 50 mcg",
    activeIngredient: "Beclometasone dipropionate 50 mcg/dose",
    formulation: "Aqueous nasal spray",
    packSize: "180 doses (200 sprays)",
    category: "nasal-sprays",
    symptoms: ["blocked-nose", "runny-nose", "itchy-nose", "sneezing"],
    price: 5.49,
    stockStatus: "in-stock", stockQuantity: 18,
    aisle: 4, bay: 3, shelf: 1,
    image: "🧴",
    badges: ["Targets nasal symptoms", "Takes days for full effect"],
    drowsiness: "none",
    requiresStaffHelp: true,
    disclaimer: "Adults 18+. Ask pharmacist before use.",
  },
  {
    id: "p06", sku: "NSP-FLU-50", gtin: "5000000000066",
    productName: "Fluticasone Nasal Spray 50 mcg",
    activeIngredient: "Fluticasone propionate 50 mcg/dose",
    formulation: "Aqueous nasal spray",
    packSize: "150 doses",
    category: "nasal-sprays",
    symptoms: ["blocked-nose", "runny-nose", "itchy-nose", "sneezing"],
    price: 6.29,
    stockStatus: "in-stock", stockQuantity: 15,
    aisle: 4, bay: 3, shelf: 1,
    image: "🧴",
    badges: ["Once daily", "Targets nasal symptoms"],
    drowsiness: "none",
    requiresStaffHelp: true,
    disclaimer: "Adults 18+. Ask pharmacist before use.",
  },
  {
    id: "p07", sku: "NSP-SAL-100", gtin: "5000000000073",
    productName: "Saline Nasal Spray",
    activeIngredient: "Sodium chloride 0.9% w/v",
    formulation: "Isotonic saline spray",
    packSize: "100 ml",
    category: "nasal-sprays",
    symptoms: ["blocked-nose", "runny-nose"],
    price: 3.99,
    stockStatus: "in-stock", stockQuantity: 30,
    aisle: 4, bay: 3, shelf: 2,
    image: "🧴",
    badges: ["Drug-free", "Suitable in pregnancy"],
    drowsiness: "none",
    requiresStaffHelp: false,
    disclaimer: "Suitable for adults and children. Preservative-free.",
  },
  {
    id: "p08", sku: "NSP-XYL-10", gtin: "5000000000080",
    productName: "Xylometazoline Decongestant Spray",
    activeIngredient: "Xylometazoline hydrochloride 0.1%",
    formulation: "Nasal spray",
    packSize: "10 ml",
    category: "nasal-sprays",
    symptoms: ["blocked-nose"],
    price: 3.29,
    stockStatus: "in-stock", stockQuantity: 12,
    aisle: 4, bay: 3, shelf: 2,
    image: "🧴",
    badges: ["Fast decongestant", "Max 7 days use"],
    drowsiness: "none",
    requiresStaffHelp: true,
    disclaimer: "Do not use for more than 7 days. Adults and children 12+.",
  },
  {
    id: "p09", sku: "EYE-SCG-2", gtin: "5000000000097",
    productName: "Sodium Cromoglicate Eye Drops",
    activeIngredient: "Sodium cromoglicate 2% w/v",
    formulation: "Eye drops",
    packSize: "10 ml",
    category: "eye-drops",
    symptoms: ["itchy-eyes", "watery-eyes"],
    price: 4.49,
    stockStatus: "in-stock", stockQuantity: 24,
    aisle: 5, bay: 1, shelf: 2,
    image: "💧",
    badges: ["For itchy and watery eyes", "Suitable from age 6"],
    drowsiness: "none",
    requiresStaffHelp: false,
    disclaimer: "Use 4 times a day. Read the label before use.",
  },
  {
    id: "p10", sku: "EYE-PF-10", gtin: "5000000000103",
    productName: "Preservative-Free Allergy Eye Drops",
    activeIngredient: "Sodium cromoglicate 2% (preservative-free)",
    formulation: "Single-dose eye drops",
    packSize: "20 x 0.35 ml vials",
    category: "eye-drops",
    symptoms: ["itchy-eyes", "watery-eyes"],
    price: 7.99,
    stockStatus: "low-stock", stockQuantity: 3,
    aisle: 5, bay: 1, shelf: 2,
    image: "💧",
    badges: ["Preservative-free", "Suitable for contact lens wearers"],
    drowsiness: "none",
    requiresStaffHelp: false,
    disclaimer: "Discard vial after single use.",
  },
  {
    id: "p11", sku: "EYE-AZE-5", gtin: "5000000000110",
    productName: "Azelastine Eye Drops",
    activeIngredient: "Azelastine hydrochloride 0.05%",
    formulation: "Eye drops",
    packSize: "8 ml",
    category: "eye-drops",
    symptoms: ["itchy-eyes", "watery-eyes"],
    price: 8.49,
    stockStatus: "ask-staff", stockQuantity: 0,
    aisle: 5, bay: 1, shelf: 3,
    image: "💧",
    badges: ["Fast acting", "Twice daily"],
    drowsiness: "none",
    requiresStaffHelp: true,
    disclaimer: "Adults and children 12+. Ask pharmacy team.",
  },
  {
    id: "p12", sku: "LIQ-CHILD-CET", gtin: "5000000000127",
    productName: "Children's Cetirizine Oral Solution",
    activeIngredient: "Cetirizine hydrochloride 1 mg/ml",
    formulation: "Oral liquid (banana flavour)",
    packSize: "200 ml with dosing syringe",
    category: "tablets",
    symptoms: ["sneezing", "runny-nose", "itchy-nose", "itchy-eyes"],
    price: 5.99,
    stockStatus: "in-stock", stockQuantity: 14,
    aisle: 4, bay: 2, shelf: 1,
    image: "🍼",
    badges: ["Children's product", "From age 2", "Sugar-free"],
    drowsiness: "low",
    requiresStaffHelp: true,
    disclaimer: "For children aged 2-12. Ask pharmacy team about dosing.",
  },
];

export function scoreProduct(p: Product, selected: SymptomId[]): number {
  if (selected.length === 0) return p.symptoms.length;
  return p.symptoms.filter((s) => selected.includes(s)).length;
}

export function relevantCategories(selected: SymptomId[]): { cat: Category; score: number; count: number }[] {
  return CATEGORIES.map((cat) => {
    const count = PRODUCTS.filter((p) => p.category === cat.id).length;
    const score = selected.length === 0
      ? 1
      : cat.symptoms.filter((s) => selected.includes(s)).length;
    return { cat, score, count };
  }).sort((a, b) => b.score - a.score);
}
