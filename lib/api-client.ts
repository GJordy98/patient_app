import { OrderListResponse } from '@/types/order';
import { Category, Product, Pharmacy, CatalogItem, CartResponse, APICartItem, AppNotification, Wallet, AppTransaction } from '@/types/common';

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://e-doctorpharma.onrender.com/api/v1'
};

export interface UserData {
  id: string;
  telephone: string;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  account: UserData;
}

export interface OrderResponse {
  order_id: string;
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

type APIListResponse<T> = T[] | { results: T[] };

export interface Address {
  id: string;
  title: string;
  address: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  label: string;
  phone: string;
  isDefault: boolean;
}

interface ApiError extends Error {
  status?: number;
}

export interface InvoiceProduct {
  id: string;
  name: string;
  dci?: string;
  galenic?: string;
}

export interface InvoiceItem {
  id: string;
  product: InvoiceProduct;
  quantity: string;
  unit_price: string;
  line_total: string;
  status: string;
  created_at: string;
}

export interface InvoiceResponse {
  officine_name: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  items: InvoiceItem[];
  created_at: string;
}

// ========== Sub-Order (Pharmacist Product Proposal) Interfaces ==========

export interface SubOrderProduct {
  id?: string;
  name?: string;
  dci?: string;
  galenic?: string;
  [key: string]: unknown;
}

export interface SubOrderItem {
  id: string | number;
  product?: SubOrderProduct;
  product_name?: string;
  quantity?: number;
  sale_price?: number;
  unit_price?: number;
  price?: number;
  line_total?: number;
  total_price?: number;
  [key: string]: unknown;
}

// ========== Pharmacist Product Management Interfaces ==========

export interface PharmacistProduct {
  id: string;
  name: string;
  dci?: string;
  dosage?: string;
  category: string;
  galenic: string;
  unit_base: string;
  unit_sale: string;
  unit_purchase: string;
  category_detail?: { name: string; description: string; is_medical_regulated: boolean };
  galenic_detail?: { name: string; unit_base_override: string };
  unit_base_detail?: { code: string; label: string };
  unit_sale_detail?: { code: string; label: string };
  unit_purchase_detail?: { code: string; label: string };
}

export type PharmacistProductPayload = Omit<PharmacistProduct, 'id' | 'category_detail' | 'galenic_detail' | 'unit_base_detail' | 'unit_sale_detail' | 'unit_purchase_detail'>;

export interface PharmacistLot {
  id: string;
  batch_number: string;
  expiration_date: string;
  quantity: string;
  reserved_quantity: string;
  purchase_price: string;
  status: 'AVAILABLE' | 'EXPIRED' | 'RESERVED' | 'OUT_OF_STOCK';
  pharmacy: string;
  product: string;
  unit: string;
  supplier: string;
  product_detail?: PharmacistProduct;
  unit_detail?: { code: string; label: string };
  supplier_detail?: { name: string; address: string };
}

export type PharmacistLotPayload = Omit<PharmacistLot, 'id' | 'product_detail' | 'unit_detail' | 'supplier_detail'>;

export interface PharmacistProductPrice {
  id: string;
  product: string;
  sale_price: number;
  purchase_price?: number;
  product_detail?: PharmacistProduct;
}

class ApiClient {
  private getTokens() {
    if (typeof window === 'undefined') return { access: null, refresh: null };
    return {
      access: localStorage.getItem('access_token'),
      refresh: localStorage.getItem('refresh_token')
    };
  }

  private saveTokens(access: string, refresh: string) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);

    const expirationDays = 7;
    const expires = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `access_token=${access}; expires=${expires}; path=/; SameSite=Strict`;
    document.cookie = `refresh_token=${refresh}; expires=${expires}; path=/; SameSite=Strict`;
  }

  private clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');

    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // Flag pour éviter les boucles infinies lors du refresh
  private _isRefreshing = false;

  private async refreshAccessToken(): Promise<string> {
    const { refresh } = this.getTokens();
    if (!refresh) throw new Error('No refresh token');

    const response = await fetch(`${API_CONFIG.BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      throw new Error('Refresh token expired or invalid');
    }

    const data = await response.json() as { access: string; refresh?: string };
    const newRefresh = data.refresh || refresh;
    this.saveTokens(data.access, newRefresh);
    return data.access;
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  }

  // Vérifie si l'utilisateur connecté est un patient (et non un pharmacien/admin)
  isPatient(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('user_data');
    if (!stored) return false;
    try {
      const user = JSON.parse(stored) as UserData;
      const role = (user.role || '').toUpperCase();
      if (role === 'OFFICINE' || role === 'PHARMACIEN' || role === 'ADMIN' || role === 'PHARMACIST') return false;
      return true;
    } catch {
      return false;
    }
  }

  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('237')) return '+' + cleaned;
    return '+237' + cleaned;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, requireAuth = false): Promise<T> {
    const { access } = this.getTokens();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (headers['Content-Type'] === 'undefined') {
      delete headers['Content-Type'];
    }

    if (requireAuth) {
      if (!access) {
        throw new Error('Not authenticated');
      }
      headers['Authorization'] = `Bearer ${access}`;
    }

    const executeRequest = async (authHeader?: string): Promise<T> => {
      const reqHeaders = { ...headers };
      if (authHeader) reqHeaders['Authorization'] = `Bearer ${authHeader}`;

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...options,
        headers: reqHeaders
      });

      if (!response.ok) {
        if (response.status === 401 && requireAuth && !this._isRefreshing) {
          try {
            this._isRefreshing = true;
            const newToken = await this.refreshAccessToken();
            this._isRefreshing = false;
            return executeRequest(newToken);
          } catch {
            this._isRefreshing = false;
            this.clearTokens();
            if (typeof window !== 'undefined') window.location.href = '/login';
            throw new Error('Session expired. Please log in again.');
          }
        }

        let errorMessage = `HTTP Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
        } catch {
          // non-JSON body — ignore
        }

        throw new Error(errorMessage);
      }

      return response.json();
    };

    return executeRequest();
  }


  // ========== Auth Methods ==========

  async login(telephone: string, password: string): Promise<AuthResponse> {
    const formattedPhone = telephone.startsWith('+') ? telephone : this.formatPhone(telephone);
    const data = await this.request<AuthResponse>('/login/', {
      method: 'POST',
      body: JSON.stringify({ telephone: formattedPhone, password })
    });
    this.saveTokens(data.access, data.refresh);
    localStorage.setItem('user_data', JSON.stringify(data.account));
    return data;
  }

  async register(userData: Partial<UserData> & { password?: string }): Promise<{ success: boolean; message: string; user?: UserData; otp?: string; data?: unknown }> {
    const formattedPhone = this.formatPhone(userData.telephone || '');
    const cleanData = { ...userData, telephone: formattedPhone };
    return await this.request('/register/', {
      method: 'POST',
      body: JSON.stringify(cleanData)
    });
  }

  async requestPasswordReset(telephone: string): Promise<{ success: boolean; message: string }> {
    const formattedPhone = this.formatPhone(telephone);
    return await this.request<{ success: boolean; message: string }>('/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ telephone: formattedPhone })
    });
  }

  async validateOTP(telephone: string, otp: string): Promise<{ success: boolean; message: string; access?: string; refresh?: string; account?: UserData }> {
    const formattedPhone = this.formatPhone(telephone);
    const response = await this.request<{ success: boolean; message: string; access?: string; refresh?: string; account?: UserData }>(
      '/valid-otp/',
      { method: 'POST', body: JSON.stringify({ telephone: formattedPhone, otp }) }
    );
    if (response.access && response.refresh) {
      this.saveTokens(response.access, response.refresh);
      if (response.account) {
        localStorage.setItem('user_data', JSON.stringify(response.account));
      }
    }
    return response;
  }

  async sendOTP(telephone: string): Promise<{ success?: boolean; status?: boolean; message: string; otp?: string }> {
    const formattedPhone = this.formatPhone(telephone);
    const response = await this.request<{ success?: boolean; status?: boolean; message: string; otp?: string }>(
      '/send-otp/',
      { method: 'POST', body: JSON.stringify({ telephone: formattedPhone }) }
    );
    console.log('✅ Réponse /send-otp/:', JSON.stringify(response));
    if (response.otp) {
      console.log('🔑 Code OTP reçu du backend:', response.otp);
    }
    return response;
  }

  async changeForgotPassword(telephone: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const formattedPhone = this.formatPhone(telephone);
    const response = await this.request<{ success: boolean; message: string }>(
      '/change-fogot-password/',
      {
        method: 'POST',
        body: JSON.stringify({
          telephone: formattedPhone,
          otp,
          new_password: newPassword,
          password: newPassword,
        }),
      }
    );
    console.log('✅ Mot de passe changé:', response);
    return response;
  }

  logout() {
    this.clearTokens();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  // ========== User Profile Methods ==========

  async getUserProfile(): Promise<UserData | null> {
    try {
      const stored = localStorage.getItem('user_data');
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.id) {
        console.warn('No user ID found for profile fetch');
        return user;
      }
      if (!this.isPatient()) {
        console.info('[getUserProfile] Compte non-patient — retour des données locales');
        return user;
      }
      const data = await this.request<UserData>(`/patient/${user.id}/`, {}, true);
      localStorage.setItem('user_data', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      const stored = localStorage.getItem('user_data');
      return stored ? JSON.parse(stored) : null;
    }
  }

  async updateUserProfile(data: Partial<UserData>): Promise<{ success: boolean; message: string; user?: UserData }> {
    const stored = localStorage.getItem('user_data');
    const user = stored ? JSON.parse(stored) : null;
    if (!user?.id) throw new Error('No user ID found for profile update');
    const updatedUser = await this.request<UserData>(`/patient/${user.id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }, true);
    localStorage.setItem('user_data', JSON.stringify(updatedUser));
    return { success: true, message: 'Profil mis à jour', user: updatedUser };
  }

  async changePassword(current: string, newOne: string): Promise<{ success: boolean; message: string }> {
    const stored = localStorage.getItem('user_data');
    const user = stored ? JSON.parse(stored) : null;
    const telephone = user?.telephone || '';
    return await this.request<{ success: boolean; message: string }>('/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: current, new_password: newOne, telephone })
    }, true);
  }

  // ========== Pharmacy Methods ==========

  async getNearbyPharmacies(lat: number, lng: number): Promise<Pharmacy[]> {
    try {
      return await this.request<Pharmacy[]>(`/officines/nearby/?latitude=${lat}&longitude=${lng}`);
    } catch (error) {
      console.warn('[getNearbyPharmacies] Erreur backend:', error);
      return [];
    }
  }

  async getAllPharmacies(page = 1): Promise<APIListResponse<Pharmacy>> {
    try {
      return await this.request<APIListResponse<Pharmacy>>(`/officine/?page=${page}`, {}, true);
    } catch (error) {
      console.error('[getAllPharmacies] Erreur backend:', error);
      return { results: [] };
    }
  }

  async getPharmacyDetails(pharmacyId: string): Promise<Pharmacy> {
    try {
      return await this.request<Pharmacy>(`/officine/${pharmacyId}/`, {}, true);
    } catch (error) {
      console.error('[getPharmacyDetails] Erreur backend:', error);
      throw error;
    }
  }

  async getPharmacyProducts(pharmacyId: string): Promise<CatalogItem[]> {
    try {
      const data = await this.request<CatalogItem[] | APIListResponse<CatalogItem>>(`/officine/${pharmacyId}/list-product/`, {}, true);
      const items = Array.isArray(data) ? data : (data.results || []);
      if (items.length > 0) {
        console.log(`[getPharmacyProducts:${pharmacyId}] 1er item:`, JSON.stringify(items[0], null, 2));
      }
      return items;
    } catch (error) {
      console.error('[getPharmacyProducts] Erreur backend:', error);
      return [];
    }
  }

  async getAllPharmaciesProducts(): Promise<CatalogItem[]> {
    try {
      const data = await this.request<CatalogItem[] | APIListResponse<CatalogItem>>('/officine/list-all-product-officine/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('[getAllPharmaciesProducts] Erreur backend:', error);
      return [];
    }
  }

  // ========== Product Methods ==========

  async getProducts(page = 1, categoryId?: string): Promise<{ results: Product[]; count: number }> {
    let endpoint = `/products/?page=${page}`;
    if (categoryId) endpoint += `&category=${categoryId}`;
    try {
      const data = await this.request<{ results: Product[]; count: number } | Product[]>(endpoint);
      if (Array.isArray(data)) return { results: data, count: data.length };
      return data as { results: Product[]; count: number };
    } catch (error) {
      console.error('[getProducts] Erreur backend:', error);
      return { results: [], count: 0 };
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const data = await this.request<APIListResponse<Category>>('/categories/');
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('[getCategories] Erreur backend:', error);
      return [];
    }
  }

  // ========== Search Methods ==========

  async searchProducts(query: string, lat?: number, lng?: number, distance?: number, page = 1): Promise<{ results: CatalogItem[]; count: number }> {
    const params = new URLSearchParams({ q: query, page: page.toString() });
    if (lat !== undefined) params.append('latitude', lat.toString());
    if (lng !== undefined) params.append('longitude', lng.toString());
    if (distance !== undefined) params.append('distance', distance.toString());
    type RawSearchItem = Record<string, unknown>;
    const data = await this.request<RawSearchItem[] | { results: RawSearchItem[]; count: number }>(`/search/products/?${params.toString()}`);
    const rawList: RawSearchItem[] = Array.isArray(data) ? data : ((data as { results: RawSearchItem[] }).results || []);

    const normalized: CatalogItem[] = [];
    rawList.forEach((raw) => {
      const isFlat = !raw.product && !!raw.name;
      if (isFlat) {
        const product: Product = {
          id: raw.id as string,
          name: (raw.name as string) || '',
          dci: raw.dci as string | undefined,
          galenic: raw.galenic as string | undefined,
          category: raw.category as string | undefined,
        };
        const pharmacies = (raw.pharmacies as Pharmacy[]) || [];
        if (pharmacies.length > 0) {
          pharmacies.forEach((pharmacy) => {
            normalized.push({
              id: `${raw.id}-${pharmacy.id}`,
              product,
              officine_detail: pharmacy,
              sale_price: ((pharmacy as unknown as Record<string, unknown>).sale_price as number) || 0,
              price: 0,
            });
          });
        } else {
          normalized.push({ id: raw.id as string, product, sale_price: 0, price: 0 });
        }
      } else {
        normalized.push(raw as unknown as CatalogItem);
      }
    });
    return { results: normalized, count: normalized.length };
  }

  async searchPharmaciesByAvailability(items: { product_id: string; quantity: number }[]): Promise<Pharmacy[]> {
    const data = await this.request<Pharmacy[] | { results: Pharmacy[] }>('/pharmacies/availability/', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return Array.isArray(data) ? data : (data.results || []);
  }

  // ========== Order Methods ==========

  async createOrder(formData: FormData): Promise<OrderResponse> {
    return await this.request<OrderResponse>('/checkout/', {
      method: 'POST',
      headers: { 'Content-Type': 'undefined' },
      body: formData
    }, true);
  }

  async validateOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>(
      `/officine-order/${orderId}/validate/`,
      { method: 'POST' },
      true
    );
  }

  async uploadPrescription(file: File): Promise<{ file_url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return await this.request<{ file_url: string; id: string }>('/prescriptions/upload/', {
      method: 'POST',
      headers: { 'Content-Type': 'undefined' },
      body: formData
    }, true);
  }

  async sendPrescriptionOrder(
    officineId: string,
    file: File,
    note?: string
  ): Promise<{ success: boolean; message: string; order_id?: string }> {
    const formData = new FormData();
    formData.append('prescription', file);
    if (note) formData.append('note', note);

    const data = await this.request<{ success?: boolean; status?: boolean; message: string; order_id?: string }>(
      `/send-presciption-order/${officineId}/validate/`,
      { method: 'POST', body: formData },
      true
    );
    return {
      success: data.success ?? data.status ?? true,
      message: data.message || 'Ordonnance envoyée avec succès',
      order_id: data.order_id,
    };
  }

  async getMyOrders(status?: string): Promise<OrderListResponse> {
    try {
      const params = status ? `?status=${encodeURIComponent(status)}` : '';
      return await this.request<OrderListResponse>(`/patient/list_order_patient/${params}`, {}, true);
    } catch (error) {
      console.error('[getMyOrders] Erreur backend:', error);
      return { results: [], count: 0, next: null, previous: null };
    }
  }

  async getOrderById(orderId: string): Promise<import('@/types/order').Order | null> {
    type RawItem = {
      product_id?: unknown; product?: unknown; id?: unknown;
      product_name?: unknown; name?: unknown;
      product_detail?: { name?: unknown };
      quantity?: unknown; qty?: unknown;
      unit_price?: unknown; price?: unknown; sale_price?: unknown;
      total_price?: unknown; subtotal?: unknown; total?: unknown;
      line_total?: unknown; amount?: unknown;
    };

    const normalizeItems = (rawItems: unknown): import('@/types/order').OrderItem[] | undefined => {
      if (!Array.isArray(rawItems) || rawItems.length === 0) return undefined;
      return (rawItems as RawItem[]).map((item) => {
        const productObj = item.product && typeof item.product === 'object'
          ? (item.product as Record<string, unknown>)
          : null;
        const productName = String(
          item.product_name
          || item.name
          || (productObj?.name)
          || (item.product_detail && typeof item.product_detail === 'object'
            ? String((item.product_detail as Record<string, unknown>).name || '')
            : '')
          || 'Produit'
        );
        const productId = String(item.product_id || (productObj?.id) || item.id || '');
        const unitPrice = item.unit_price ?? item.price ?? item.sale_price;
        const totalPrice = item.line_total ?? item.total_price ?? item.subtotal ?? item.amount ?? item.total ?? 0;
        return {
          product_id: productId,
          product_name: productName,
          quantity: (item.quantity ?? item.qty ?? 1) as string | number,
          unit_price: unitPrice as string | number | undefined,
          total_price: totalPrice as string | number,
        };
      });
    };

    /* Normalise un objet order brut (gère les champs imbriqués) */
    const normalizeOrder = (data: Record<string, unknown>): import('@/types/order').Order => {
      const rawItems = (data.items || data.order_items || data.products || data.line_items) as unknown;
      const items = normalizeItems(rawItems);
      // pharmacy peut être un objet → on extrait son nom
      const pharmacyRaw = data.pharmacy;
      const pharmacy_name = (data.pharmacy_name as string)
        || (pharmacyRaw && typeof pharmacyRaw === 'object'
          ? String((pharmacyRaw as Record<string, unknown>).name || '')
          : String(pharmacyRaw || ''))
        || undefined;
      return {
        ...(data as unknown as import('@/types/order').Order),
        ...(pharmacy_name ? { pharmacy_name } : {}),
        ...(items ? { items } : {}),
      };
    };

    let rawOrder: Record<string, unknown> | null = null;

    /* 1. Chercher dans la liste complète des commandes patient en priorité (évite les 404) */
    try {
      const list = await this.getMyOrders();
      const orders = Array.isArray(list) ? list : (list.results || []);
      const found = orders.find((o) => o.id === orderId || o.order_id === orderId);
      rawOrder = found ? (found as unknown as Record<string, unknown>) : null;
    } catch (err) {
      console.error('[getOrderById] Erreur liste:', err);
    }

    /* 2. Fallback : Endpoints directs (si c'est un ID d'officine-order venu d'une notif) */
    if (!rawOrder) {
      const candidateEndpoints = [
        `/officine-order/${orderId}/`,
      ];
      for (const endpoint of candidateEndpoints) {
        try {
          rawOrder = await this.request<Record<string, unknown>>(endpoint, {}, true);
          break;
        } catch {
          // endpoint non disponible, on continue
        }
      }
    }

    if (!rawOrder) return null;

    let normalized = normalizeOrder(rawOrder);

    /* 3. Récupérer les produits validés par la pharmacie via l'endpoint facture */
    if (!Array.isArray(normalized.items) || normalized.items.length === 0) {
      try {
        const invoiceResp = await this.request<{ status: boolean; invoices?: InvoiceResponse[] }>('/get-invoice-order-patient/', {
          method: 'POST',
          body: JSON.stringify({ order_id: orderId })
        }, true);
        const firstInvoice = invoiceResp.invoices?.[0];
        if (firstInvoice?.items && firstInvoice.items.length > 0) {
          const invoiceItems = normalizeItems(firstInvoice.items);
          if (invoiceItems && invoiceItems.length > 0) {
            normalized = { ...normalized, items: invoiceItems };
          }
        }
      } catch {
        // silent — pas de facture encore disponible
      }
    }

    return normalized;
  }

  async getInvoiceByOrderId(orderId: string): Promise<InvoiceResponse[]> {
    try {
      const data = await this.request<{ status: boolean; invoices?: InvoiceResponse[] }>('/get-invoice-order-patient/', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId })
      }, true);
      return data.invoices || [];
    } catch {
      return [];
    }
  }

  async downloadInvoicePDF(orderId: string): Promise<Blob> {
    const { access } = this.getTokens();
    const headers: Record<string, string> = {};
    if (access) headers['Authorization'] = `Bearer ${access}`;
    
    // Le endpoint exact fourni par l'utilisateur
    const response = await fetch(`${API_CONFIG.BASE_URL}/get-invoice-order-patient/${orderId}/pdf/`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error('Erreur lors du téléchargement de la facture PDF');
    }

    return response.blob();
  }

  async validateInvoice(orderId: string): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>(
      `/officine-order/${orderId}/validate/`,
      { method: 'POST' },
      true
    );
  }

  async confirmReception(orderId: string): Promise<{ success: boolean; message: string }> {
    return this.validateInvoice(orderId);
  }

  async rejectInvoice(orderId: string): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>('/validated-order-by-patient/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, status: 'CANCELLED' })
    }, true);
  }

  async validateByPatient(orderId: string): Promise<{ order_id: string; status: string }> {
    return await this.request<{ order_id: string; status: string }>('/validated-order-by-patient/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, status: 'VALIDATED' })
    }, true);
  }

  /**
   * Récupère les produits proposés par la pharmacie (sous-commande ordonnance).
   * GET /officine-order/{id}/items-order/
   * (les items créés via POST /sub-order-item-officine/)
   */
  async getSubOrderItems(orderId: string): Promise<SubOrderItem[]> {
    try {
      const data = await this.request<SubOrderItem[] | { results?: SubOrderItem[]; items?: SubOrderItem[] }>(
        `/officine-order/${orderId}/items-order/`,
        { method: 'GET' },
        true
      );
      if (Array.isArray(data)) return data;
      return (data as { results?: SubOrderItem[]; items?: SubOrderItem[] }).results
        ?? (data as { results?: SubOrderItem[]; items?: SubOrderItem[] }).items
        ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Le patient valide ou refuse la proposition de la pharmacie.
   * POST /validated-order-by-patient/  { order_id, status: "VALIDATED" | "REJECTED" }
   */
  async validateSubOrderByPatient(orderId: string, status: 'VALIDATED' | 'REJECTED'): Promise<{ order_id: string; status: string }> {
    return await this.request<{ order_id: string; status: string }>('/validated-order-by-patient/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, status })
    }, true);
  }

  async reportDispute(orderId: string, reason: string, photo?: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('order', orderId);
    formData.append('reason', reason);
    if (photo) formData.append('image', photo);

    return await this.request<{ success: boolean; message: string }>('/dispute-order/', {
      method: 'POST',
      headers: { 'Content-Type': 'undefined' },
      body: formData
    }, true);
  }

  // ========== Cart Methods ==========

  async getAllCarts(): Promise<CartResponse[]> {
    try {
      const data = await this.request<CartResponse[] | { results: CartResponse[] }>('/patient-cart/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('[getAllCarts] Erreur:', error);
      return [];
    }
  }

  async getCart(): Promise<CartResponse | APICartItem[]> {
    try {
      return await this.request<CartResponse | APICartItem[]>('/patient-cart/get_cart/', { method: 'GET' }, true);
    } catch (error) {
      const msg = (error instanceof Error ? error.message : '').toLowerCase();
      if (!msg.includes('no active cart')) {
        console.error('[getCart] Erreur:', error);
      }
      return [];
    }
  }

  async getCartWithLocation(lat: string, lng: string): Promise<CartResponse | APICartItem[]> {
    try {
      return await this.request<CartResponse | APICartItem[]>(
        `/patient-cart/get_cart/?latitude=${lat}&longitude=${lng}`,
        { method: 'GET' },
        true
      );
    } catch (error) {
      console.error('[getCartWithLocation] Erreur:', error);
      return [];
    }
  }

  async getCartById(cartId: string): Promise<CartResponse | null> {
    try {
      return await this.request<CartResponse>(`/patient-cart/${cartId}/`, { method: 'GET' }, true);
    } catch (error) {
      console.error('[getCartById] Erreur:', error);
      return null;
    }
  }

  async addToCart(productId: string, quantity: number, pharmacyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.request<{ success?: boolean; message?: string;[key: string]: unknown }>('/patient-cart/add_item/', {
        method: 'POST',
        body: JSON.stringify({
          product: String(productId),
          quantity: quantity,
          pharmacy: String(pharmacyId)
        })
      }, true);
      return {
        success: result.success ?? true,
        message: result.message || 'Article ajouté au panier'
      };
    } catch (error) {
      console.error('[addToCart] Erreur:', error);
      throw error;
    }
  }

  async updateCart(cartId: string, data: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<unknown>(`/patient-cart/${cartId}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }, true);
      return { success: true, message: 'Panier mis à jour' };
    } catch (error) {
      console.error('[updateCart] Erreur:', error);
      throw error;
    }
  }

  async deleteCart(cartId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<unknown>(`/patient-cart/${cartId}/`, { method: 'DELETE' }, true);
      return { success: true, message: 'Panier supprimé' };
    } catch (error) {
      console.error('[deleteCart] Erreur:', error);
      throw error;
    }
  }

  async removeCartItem(itemId: string, quantity = 1): Promise<{ success: boolean; message: string }> {
    const { access } = this.getTokens();
    const payload = { item_id: itemId, quantity };
    console.log('[removeCartItem] payload envoyé:', JSON.stringify(payload));

    const response = await fetch(`${API_CONFIG.BASE_URL}/patient-cart/remove_item/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Erreur HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('[removeCartItem] Réponse erreur serveur:', JSON.stringify(errorData));
        errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
      } catch { /* corps non-JSON */ }
      throw new Error(errorMessage);
    }

    // L'API peut renvoyer un corps vide (204 No Content)
    const text = await response.text();
    if (!text) return { success: true, message: 'Article retiré du panier' };
    try {
      const result = JSON.parse(text) as { success: boolean; message: string };
      console.log('[removeCartItem] Réponse succès:', JSON.stringify(result));
      return result;
    } catch {
      return { success: true, message: 'Article retiré du panier' };
    }
  }

  // ========== Notification Methods ==========

  async registerFCMToken(token: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/register-fcm-token/', {
      method: 'POST',
      body: JSON.stringify({ token, device_type: 'web' })
    }, true);
  }

  async getNotifications(): Promise<AppNotification[]> {
    if (!this.isPatient()) return [];
    try {
      type RawNotif = Record<string, unknown>;
      const data = await this.request<RawNotif[] | { notifications: RawNotif[] } | { results: RawNotif[] }>('/patient/list_notification_patient/', { method: 'GET' }, true);
      let list: RawNotif[];
      if (Array.isArray(data)) list = data;
      else if ('notifications' in data) list = data.notifications as RawNotif[];
      else if ('results' in data) list = data.results as RawNotif[];
      else list = [];

      const ORDER_KEYWORDS = ['commande', 'order', 'approved', 'validée', 'validé', 'livraison', 'delivery'];

      return list.map((n): AppNotification => {
        const message = (n.message as string) || (n.content as string) || '';
        const is_read = (n.is_read as boolean) ?? (n.read as boolean) ?? false;
        let normalizedType = typeof n.type === 'string' ? n.type.toUpperCase() : undefined;

        const titleLower = ((n.title as string) || '').toLowerCase();
        const msgLower = message.toLowerCase();
        if (!normalizedType) {
          const isOrderByKeyword = ORDER_KEYWORDS.some(k => titleLower.includes(k) || msgLower.includes(k));
          if (isOrderByKeyword) normalizedType = 'ORDER';
        }

        const extra = (n.data as Record<string, unknown>) || {};
        const order_id: string | undefined =
          (n.order_id as string | undefined)
          || (extra.order_id as string | undefined)
          || (extra.order as string | undefined)
          || (n.related_order_id as string | undefined)
          || (n.object_id as string | undefined)
          || undefined;

        return {
          id: n.id as string,
          title: (n.title as string) || '',
          message,
          content: n.content as string | undefined,
          created_at: (n.created_at as string) || '',
          is_read,
          read: n.read as boolean | undefined,
          type: normalizedType,
          order_id,
          data: n.data as Record<string, unknown> | undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async getWallet(): Promise<Wallet | null> {
    try {
      type RawWallet = Record<string, unknown>;
      const raw = await this.request<RawWallet | RawWallet[] | { results: RawWallet[] } | { wallet: RawWallet }>(
        '/wallet-patient/get_wallet_patient/',
        { method: 'GET' },
        true
      );
      console.log('[getWallet] Réponse brute:', JSON.stringify(raw));

      // Extraire l'objet wallet selon le format reçu
      let obj: RawWallet | null = null;
      if (Array.isArray(raw)) {
        obj = raw.length > 0 ? (raw[0] as RawWallet) : null;
      } else if (raw && typeof raw === 'object') {
        if ('results' in raw && Array.isArray((raw as { results: RawWallet[] }).results)) {
          const arr = (raw as { results: RawWallet[] }).results;
          obj = arr.length > 0 ? arr[0] : null;
        } else if ('wallet' in raw) {
          obj = (raw as { wallet: RawWallet }).wallet;
        } else {
          obj = raw as RawWallet;
        }
      }

      if (!obj) return null;

      // Normaliser les champs balance / locked_amount (le backend peut utiliser des noms différents)
      const balance =
        Number(obj.balance ?? obj.amount ?? obj.solde ?? obj.total_amount ?? 0);
      const locked_amount =
        Number(obj.locked_amount ?? obj.blocked_amount ?? obj.reserved_amount ?? 0);

      return {
        id: (obj.id as string) || '',
        balance,
        locked_amount,
        created_at: (obj.created_at as string) || '',
        updated_at: (obj.updated_at as string) || undefined,
      };
    } catch (error) {
      console.error('[getWallet] Erreur backend:', error);
      return null;
    }
  }


  async getWalletTransactions(): Promise<AppTransaction[]> {
    try {
      const data = await this.request<AppTransaction[] | { results: AppTransaction[] }>('/wallet-patient/transactions/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('[getWalletTransactions] Erreur backend:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>(`/patient/notification/${notificationId}/mark-read/`, {
        method: 'POST'
      }, true);
    } catch (error) {
      console.warn('[markNotificationAsRead] Endpoint unavailable (404?), failing silently:', error);
      return { success: true };
    }
  }

  // ========== Address Methods ==========

  async getAddresses(): Promise<Address[]> {
    try {
      const data = await this.request<Address[] | { results: Address[] }>('/patient/addresses/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      return [];
    }
  }

  async createAddress(data: { title: string; address: string }): Promise<{ success: boolean; address: Address }> {
    return await this.request<{ success: boolean; address: Address }>('/patient/addresses/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, true);
  }

  async updateAddress(id: string, data: { title: string; address: string }): Promise<{ success: boolean; address: Address }> {
    return await this.request<{ success: boolean; address: Address }>(`/patient/addresses/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, true);
  }

  async deleteAddress(id: string): Promise<{ success: boolean }> {
    return await this.request<{ success: boolean }>(`/patient/addresses/${id}/`, {
      method: 'DELETE',
    }, true);
  }

  // ========== Payment Method Methods ==========

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const data = await this.request<PaymentMethod[] | { results: PaymentMethod[] }>('/patient/payment-methods/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  async createPaymentMethod(data: { type: string; phone: string }): Promise<{ success: boolean; payment: PaymentMethod }> {
    return await this.request<{ success: boolean; payment: PaymentMethod }>('/patient/payment-methods/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, true);
  }

  async updatePaymentMethod(id: string, data: { type: string; phone: string }): Promise<{ success: boolean; payment: PaymentMethod }> {
    return await this.request<{ success: boolean; payment: PaymentMethod }>(`/patient/payment-methods/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, true);
  }

  async deletePaymentMethod(id: string): Promise<{ success: boolean }> {
    return await this.request<{ success: boolean }>(`/patient/payment-methods/${id}/`, {
      method: 'DELETE',
    }, true);
  }

  async setDefaultPaymentMethod(id: string): Promise<{ success: boolean }> {
    return await this.request<{ success: boolean }>(`/patient/payment-methods/${id}/set-default/`, {
      method: 'POST',
    }, true);
  }

  // ========== QR Code Commande ==========

  async getOrderQrCode(orderId: string): Promise<{ qr_code?: string; qr_code_url?: string; image?: string;[key: string]: unknown }> {
    try {
      return await this.request(`/orders/${orderId}/qr-code/`, {}, true);
    } catch {
      return {};
    }
  }

  // ========== Facture ==========

  async getInvoice(orderId: string): Promise<{ id: string; total?: number; total_amount?: number; created_at?: string;[key: string]: unknown }> {
    return this.request('/get-invoice-order-patient/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId })
    }, true);
  }

  async getInvoicePdf(invoiceId: string): Promise<Blob> {
    const { access } = this.getTokens();
    const response = await fetch(`${API_CONFIG.BASE_URL}/get-invoice-order-patient/${invoiceId}/pdf/`, {
      headers: access ? { Authorization: `Bearer ${access}` } : {}
    });
    if (!response.ok) throw new Error(`Erreur PDF ${response.status}`);
    return response.blob();
  }

  // ========== Notation ==========

  async rateOrder(data: { target_type: string; target_id: string; rating: number; comment?: string }): Promise<{ success: boolean; message: string }> {
    return this.request('/rating/', {
      method: 'POST',
      body: JSON.stringify(data)
    }, true);
  }

  async reviewDriver(data: { delivery_id: string; rating: number; comment?: string }): Promise<{ success: boolean; message: string }> {
    const payload = {
      delivery_id: data.delivery_id,
      action: data.rating >= 3 ? 'APPROVED' : 'REJECTED',
      reason: data.comment || (data.rating >= 3 ? 'Bonne livraison' : 'Livraison insatisfaisante'),
    };
    return this.request('/delivery/review_driver/', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
  }

  // ========== Horaires Officine ==========

  async getPharmacySchedule(pharmacyId: string): Promise<{ schedules?: { day: string; open_time: string; close_time: string; is_guard: boolean }[] }> {
    try {
      return await this.request(`/officine/${pharmacyId}/schedule/`, {}, true);
    } catch {
      return {};
    }
  }

  // ========== Pharmacist Product Management ==========

  async getProduct(productId: string): Promise<PharmacistProduct> {
    return this.request<PharmacistProduct>(`/products/${productId}/`, {}, true);
  }

  async updateProduct(productId: string, data: Partial<PharmacistProductPayload>): Promise<PharmacistProduct> {
    return this.request<PharmacistProduct>(`/products/${productId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  }

  async getLot(lotId: string): Promise<PharmacistLot> {
    return this.request<PharmacistLot>(`/lots/${lotId}/`, {}, true);
  }

  async updateLot(lotId: string, data: Partial<PharmacistLotPayload>): Promise<PharmacistLot> {
    return this.request<PharmacistLot>(`/lots/${lotId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  }

  async getProductPrices(productId?: string): Promise<PharmacistProductPrice[]> {
    try {
      const query = productId ? `?product=${productId}` : '';
      const data = await this.request<PharmacistProductPrice[] | { results: PharmacistProductPrice[] }>(`/product-price/${query}`, {}, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch {
      return [];
    }
  }

  async updateProductPrice(priceId: string, data: Partial<{ sale_price: number; purchase_price: number }>): Promise<PharmacistProductPrice> {
    return this.request<PharmacistProductPrice>(`/product-price/${priceId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  }

  async getPharmacyLots(pharmacyId: string): Promise<PharmacistLot[]> {
    try {
      const data = await this.request<PharmacistLot[] | { results: PharmacistLot[] }>(`/lots/?pharmacy=${pharmacyId}`, {}, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch {
      return [];
    }
  }

  async getGalenics(): Promise<{ id: string; name: string }[]> {
    try {
      const data = await this.request<{ id: string; name: string }[] | { results: { id: string; name: string }[] }>('/galenics/', {}, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch {
      return [];
    }
  }

  async getUnits(): Promise<{ id: string; code: string; label: string }[]> {
    try {
      const data = await this.request<{ id: string; code: string; label: string }[] | { results: { id: string; code: string; label: string }[] }>('/units/', {}, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch {
      return [];
    }
  }

  async getProductLots(productId: string): Promise<PharmacistLot[]> {
    try {
      const data = await this.request<PharmacistLot[] | { results: PharmacistLot[] }>(`/lots/?product=${productId}`, {}, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch {
      return [];
    }
  }

}


export const api = new ApiClient();

