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
  pharmacy?: string | null;
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
}
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type OrderListResponse = PaginatedResponse<Order> | Order[];
