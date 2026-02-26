export interface Category {
  id: string | null;
  name: string;
  slug?: string;
  image?: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  dci?: string;
  galenic?: string;
  dosage?: string;
  image?: string;
  price?: number;
  category?: string | Category;
  description?: string;
  manufacturer?: string;
  // Champs détaillés retournés par /products/
  galenic_detail?: { id?: string; name?: string; unit_base_override?: unknown };
  category_detail?: { id?: string; name?: string; description?: string; is_medical_regulated?: boolean };
  unit_sale_detail?: { id?: string; code?: string; label?: string };
  unit_base_detail?: { id?: string; code?: string; label?: string };
  unit_purchase_detail?: { id?: string; code?: string; label?: string };
}

export interface Pharmacy {
  id: string;
  name: string;
  address?: string;
  quartier?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  image?: string;
  officine_name?: string; // Sometimes used in API
  description?: string;
  city?: string;
  street?: string;
  bp?: string;
}

export interface CatalogItem {
  id: string;
  product: Product;
  officine_detail?: Pharmacy;
  pharmacyId?: string;
  quantity?: number;
  sale_price: number;
  price?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface APICartItem {
  id: string;
  product: string;
  quantity: number | string;
  pharmacy?: string;
  product_name?: string;
  sale_price?: number;
  price?: number;
  pharmacy_name?: string;
  product_detail?: Product;
  cart?: string;
  [key: string]: unknown;
}

export interface CartResponse {
  cart: {
    id: string;
    patient?: string;
    total_amount?: string;
    status?: string;
    expires_at?: string | null;
    items: APICartItem[];
  };
  delivery_fee?: number;
  [key: string]: unknown;
}
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type?: string;
}

export interface Wallet {
  id: string;
  balance: number;
  locked_amount: number;
  created_at: string;
  updated_at?: string;
}

export interface AppTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  description: string;
  created_at: string;
  reference?: string;
}
