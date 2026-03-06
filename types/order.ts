export interface OrderItem {
  product_id?: string;
  product_name: string;
  quantity: string | number;
  unit_price?: string | number;
  total_price: string | number;
}

export interface Order {
  id: string;
  order_id?: string;
  items?: OrderItem[];
  prescription?: string | null;
  status: string;
  total_amount: string | number;
  delivery_fee?: string | number;
  payment_status?: string;
  pharmacy?: string | Record<string, unknown> | null; // peut être un objet complet côté backend
  pharmacy_name?: string | null;
  created_at?: string;
  updated_at?: string;
  date?: string;
  code_reception?: string;
  pharmacy_latitude?: number;
  pharmacy_longitude?: number;
  patient_latitude?: number;
  patient_longitude?: number;
  delivery_method?: string;
  delivery_id?: string;
  pharmacy_id?: string;
  invoice_status?: string;
}
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type OrderListResponse = PaginatedResponse<Order> | Order[];
