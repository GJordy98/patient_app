import { OrderListResponse } from '@/types/order';
import { Category, Product, Pharmacy, CatalogItem, CartResponse, APICartItem, AppNotification, Wallet, AppTransaction } from '@/types/common';
import * as Mocks from './mock-data';

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
  isMockGuard?: boolean;
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

    // Stocker aussi dans les cookies pour l'accès par le middleware Next.js
    const expirationDays = 7;
    const expires = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `access_token=${access}; expires=${expires}; path=/; SameSite=Strict`;
    document.cookie = `refresh_token=${refresh}; expires=${expires}; path=/; SameSite=Strict`;
  }

  private clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');

    // Effacer aussi les cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  private throwMockGuard(): never {
    const error = new Error('Mock mode: skipping real API request') as ApiError;
    error.isMockGuard = true;
    throw error;
  }

  // Flag pour éviter les boucles infinies lors du refresh
  private _isRefreshing = false;

  // Rafraîchit le token JWT via /token/refresh/ et retourne le nouvel access token.
  // Lances une erreur si le refresh échoue (session expirée).
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
    // Sauvegarder le nouveau access token (et le refresh si le backend en retourne un nouveau)
    const newRefresh = data.refresh || refresh;
    this.saveTokens(data.access, newRefresh);
    return data.access;
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const access = localStorage.getItem('access_token');
    
    // If we have a mock token, we must ensure mock mode is on
    if (access === 'mock-access-token') {
      localStorage.setItem('use_mock_api', 'true');
    }
    
    return !!access;
  }

  isMockEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('use_mock_api') === 'true' || !process.env.NEXT_PUBLIC_API_URL;
  }

  // Vérifie si l'utilisateur connecté est un patient (et non un pharmacien/admin)
  isPatient(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('user_data');
    if (!stored) return false;
    try {
      const user = JSON.parse(stored) as UserData;
      const role = (user.role || '').toUpperCase();
      // Un compte officine/pharmacien n'est pas un patient
      if (role === 'OFFICINE' || role === 'PHARMACIEN' || role === 'ADMIN' || role === 'PHARMACIST') return false;
      // Par défaut, on considère que c'est un patient
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

    // Auto-set JSON content type if not provided and not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Explicitly delete Content-Type if set to 'undefined' (used for FormData with this.request)
    if (headers['Content-Type'] === 'undefined') {
      delete headers['Content-Type'];
    }

    if (requireAuth) {
      if (!access) {
        // Pas de token disponible — lever une erreur sans redirection
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
        // Token expired — tenter un refresh automatique (une seule fois)
        if (response.status === 401 && requireAuth && !this._isRefreshing) {
          try {
            this._isRefreshing = true;
            const newToken = await this.refreshAccessToken();
            this._isRefreshing = false;
            // Réessayer la requête avec le nouveau token
            return executeRequest(newToken);
          } catch {
            this._isRefreshing = false;
            // Refresh échoué : session vraiment expirée
            if (!access?.startsWith('mock-')) {
              this.clearTokens();
              if (typeof window !== 'undefined') window.location.href = '/login';
            }
            throw new Error('Session expired. Please log in again.');
          }
        }

        let errorMessage = `HTTP Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
        } catch (err) {
          console.error('Error parsing error response:', err);
        }

        throw new Error(errorMessage);
      }

      return response.json();
    };

    return executeRequest();
  }


  // ========== Auth Methods ==========

  // Endpoint: POST /login/
  async login(telephone: string, password: string): Promise<AuthResponse> {
    // Ne pas reformater si le numéro est déjà complet (commence par +)
    const formattedPhone = telephone.startsWith('+') ? telephone : this.formatPhone(telephone);
    let lastRealError: Error | null = null;
    try {
      // Toujours tenter le vrai backend en premier (même si use_mock_api=true)
      // Le mock ne sert que de fallback si le backend est injoignable
      const data = await this.request<AuthResponse>('/login/', {
        method: 'POST',
        body: JSON.stringify({ telephone: formattedPhone, password })
      });
      this.saveTokens(data.access, data.refresh);
      localStorage.setItem('user_data', JSON.stringify(data.account));
      localStorage.setItem('use_mock_api', 'false'); // Connecté au vrai backend
      return data;
    } catch (err) {
      lastRealError = err instanceof Error ? err : new Error(String(err));

      // Fallback mock uniquement pour les comptes créés localement
      const mockAccounts = JSON.parse(localStorage.getItem('mock_accounts') || '[]');
      const user = mockAccounts.find((u: UserData & { password?: string }) => 
        (this.formatPhone(u.telephone) === formattedPhone || u.telephone === formattedPhone) && u.password === password
      );
      
      if (user) {
        const mockResponse: AuthResponse = {
          access: 'mock-access-token',
          refresh: 'mock-refresh-token',
          account: user
        };
        this.saveTokens(mockResponse.access, mockResponse.refresh);
        localStorage.setItem('user_data', JSON.stringify(mockResponse.account));
        localStorage.setItem('use_mock_api', 'true');
        return mockResponse;
      }
      // Remonter l'erreur réelle du backend
      throw lastRealError || new Error('Identifiants invalides ou compte inexistant');
    }
  }

  // Endpoint: POST /register/
  async register(userData: Partial<UserData> & { password?: string }): Promise<{ success: boolean; message: string; user?: UserData; otp?: string; data?: unknown }> {
    const formattedPhone = this.formatPhone(userData.telephone || '');
    const cleanData = { ...userData, telephone: formattedPhone };

    try {
      return await this.request('/register/', {
        method: 'POST',
        body: JSON.stringify(cleanData)
      });
    } catch {
      // Fallback for mock registration
      const mockAccounts = JSON.parse(localStorage.getItem('mock_accounts') || '[]');
      
      // Check if user already exists
      if (mockAccounts.some((u: UserData) => this.formatPhone(u.telephone) === formattedPhone)) {
        throw new Error('Un compte avec ce numéro existe déjà');
      }

      const newUser = {
        id: `mock-user-${Date.now()}`,
        ...cleanData,
        role: 'PATIENT'
      } as UserData;
      
      mockAccounts.push(newUser);
      localStorage.setItem('mock_accounts', JSON.stringify(mockAccounts));
      console.log('Mock account registered:', newUser);
      return { success: true, message: 'Compte créé (mode local)', user: newUser };
    }
  }

  // Endpoint: POST /password-reset/
  async requestPasswordReset(telephone: string): Promise<{ success: boolean; message: string }> {
    const formattedPhone = this.formatPhone(telephone);
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
      return await this.request<{ success: boolean; message: string }>('/password-reset/', {
        method: 'POST',
        body: JSON.stringify({ telephone: formattedPhone })
      });
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return { success: true, message: 'Code envoyé (mode test)' };
      }
      throw error;
    }
  }

  // Endpoint: POST /valid-otp/
  async validateOTP(telephone: string, otp: string): Promise<{ success: boolean; message: string; access?: string; refresh?: string; account?: UserData }> {
    const formattedPhone = this.formatPhone(telephone);
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
      const response = await this.request<{ success: boolean; message: string; access?: string; refresh?: string; account?: UserData }>(
        '/valid-otp/',
        { method: 'POST', body: JSON.stringify({ telephone: formattedPhone, otp }) }
      );
      // Si la validation OTP retourne des tokens, les sauvegarder
      if (response.access && response.refresh) {
        this.saveTokens(response.access, response.refresh);
        if (response.account) {
          localStorage.setItem('user_data', JSON.stringify(response.account));
        }
      }
      return response;
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return { success: true, message: 'Code OTP validé (mode test)' };
      }
      throw error;
    }
  }

  // Endpoint: POST /send-otp/
  async sendOTP(telephone: string): Promise<{ success?: boolean; status?: boolean; message: string; otp?: string }> {
    const formattedPhone = this.formatPhone(telephone);
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
      const response = await this.request<{ success?: boolean; status?: boolean; message: string; otp?: string }>(
        '/send-otp/',
        { method: 'POST', body: JSON.stringify({ telephone: formattedPhone }) }
      );
      console.log('✅ Réponse /send-otp/:', JSON.stringify(response));
      if (response.otp) {
        console.log('🔑 Code OTP reçu du backend:', response.otp);
      }
      return response;
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        const mockOtp = '123456';
        console.log('🔑 Code OTP mock:', mockOtp);
        return { success: true, message: 'Code OTP envoyé (mode test)', otp: mockOtp };
      }
      console.error('❌ Erreur envoi OTP:', error);
      throw error;
    }
  }

  // Endpoint: POST /change-fogot-password/
  async changeForgotPassword(telephone: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const formattedPhone = this.formatPhone(telephone);
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
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
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return { success: true, message: 'Mot de passe réinitialisé (mode test)' };
      }
      console.error('❌ Erreur changement mot de passe:', error);
      throw error;
    }
  }

  logout() {
    this.clearTokens();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  // Endpoint: GET /patient/{userId}/
  async getUserProfile(): Promise<UserData | null> {
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
      const stored = localStorage.getItem('user_data');
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.id) {
        console.warn('No user ID found for profile fetch');
        return user;
      }
      // Si l'utilisateur n'est pas un patient, ne pas appeler /patient/{id}/
      if (!this.isPatient()) {
        console.info('[getUserProfile] Compte non-patient — retour des données locales');
        return user;
      }
      const data = await this.request<UserData>(`/patient/${user.id}/`, {}, true);
      localStorage.setItem('user_data', JSON.stringify(data));
      return data;
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error fetching profile:', error);
      }
      const stored = localStorage.getItem('user_data');
      return stored ? JSON.parse(stored) : null;
    }
  }

  // Endpoint: PATCH /patient/{userId}/
  async updateUserProfile(data: Partial<UserData>): Promise<{ success: boolean; message: string; user?: UserData }> {
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
      const stored = localStorage.getItem('user_data');
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.id) throw new Error('No user ID found for profile update');
      const updatedUser = await this.request<UserData>(`/patient/${user.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }, true);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      return { success: true, message: 'Profil mis à jour', user: updatedUser };
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        const stored = JSON.parse(localStorage.getItem('user_data') || '{}');
        const newUser = { ...stored, ...data };
        localStorage.setItem('user_data', JSON.stringify(newUser));
        return { success: true, message: 'Profil mis à jour (local)', user: newUser };
      }
      throw error;
    }
  }

  // Endpoint: POST /change-password/
  async changePassword(current: string, newOne: string): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
      // Récupérer le numéro de téléphone depuis le localStorage
      const stored = localStorage.getItem('user_data');
      const user = stored ? JSON.parse(stored) : null;
      const telephone = user?.telephone || '';
      return await this.request<{ success: boolean; message: string }>('/change-password/', {
        method: 'POST',
        body: JSON.stringify({ old_password: current, new_password: newOne, telephone })
      }, true);
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return { success: true, message: 'Mot de passe modifié (local)' };
      }
      throw error;
    }
  }

  // ========== Pharmacy Methods ==========

  // Endpoint: GET /officines/nearby/
  async getNearbyPharmacies(lat: number, lng: number): Promise<Pharmacy[]> {
    try {
      return await this.request<Pharmacy[]>(`/officines/nearby/?latitude=${lat}&longitude=${lng}`);
    } catch (error) {
      console.warn('[getNearbyPharmacies] Erreur backend:', error);
      return [];
    }
  }

  // Endpoint: GET /officine/ (requires auth)
  async getAllPharmacies(page = 1): Promise<APIListResponse<Pharmacy>> {
    try {
      return await this.request<APIListResponse<Pharmacy>>(`/officine/?page=${page}`, {}, true);
    } catch (error) {
      console.error('[getAllPharmacies] Erreur backend:', error);
      return { results: [] };
    }
  }

  // Endpoint: GET /officine/{id}/ (requires auth)
  async getPharmacyDetails(pharmacyId: string): Promise<Pharmacy> {
    try {
      return await this.request<Pharmacy>(`/officine/${pharmacyId}/`, {}, true);
    } catch (error) {
      console.error('[getPharmacyDetails] Erreur backend:', error);
      throw error;
    }
  }

  // Endpoint: GET /officine/{id}/list-product/ (requires auth)
  async getPharmacyProducts(pharmacyId: string): Promise<CatalogItem[]> {
    try {
      const data = await this.request<CatalogItem[] | APIListResponse<CatalogItem>>(`/officine/${pharmacyId}/list-product/`, {}, true);
      const items = Array.isArray(data) ? data : (data.results || []);
      // 🔍 LOG TEMPORAIRE — structure du 1er item pour debug pharmacie name
      if (items.length > 0) {
        console.log(`[getPharmacyProducts:${pharmacyId}] 1er item:`, JSON.stringify(items[0], null, 2));
      }
      return items;
    } catch (error) {
      console.error('[getPharmacyProducts] Erreur backend:', error);
      return [];
    }
  }

  // Endpoint: GET /officine/list-all-product-officine/ (requires auth)
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

  // Endpoint: GET /products/ (public — no auth required, no mock fallback)
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

  // Endpoint: GET /categories/ (public — no auth required, no mock fallback)
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

  // Endpoint: GET /search/products/?q=...&latitude=...&longitude=...&distance=...
  async searchProducts(query: string, lat?: number, lng?: number, distance?: number, page = 1): Promise<{ results: CatalogItem[]; count: number }> {
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
      const params = new URLSearchParams({ q: query, page: page.toString() });
      if (lat !== undefined) params.append('latitude', lat.toString());
      if (lng !== undefined) params.append('longitude', lng.toString());
      if (distance !== undefined) params.append('distance', distance.toString());
      // Le backend retourne des objets plats : { id, name, dci, galenic, category, pharmacies[] }
      type RawSearchItem = Record<string, unknown>;
      const data = await this.request<RawSearchItem[] | { results: RawSearchItem[]; count: number }>(`/search/products/?${params.toString()}`);
      const rawList: RawSearchItem[] = Array.isArray(data) ? data : ((data as { results: RawSearchItem[] }).results || []);

      // Normaliser en CatalogItem[]
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
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        const q = query.toLowerCase();
        const filtered = (Mocks.MOCK_PHARMACY_PRODUCTS as CatalogItem[]).filter(i =>
          i.product?.name?.toLowerCase().includes(q) || i.product?.dci?.toLowerCase().includes(q)
        );
        return { results: filtered, count: filtered.length };
      }
      throw error;
    }
  }


  // Endpoint: POST /pharmacies/availability/
  // Payload: { items: [{ product_id, quantity }] }
  async searchPharmaciesByAvailability(items: { product_id: string; quantity: number }[]): Promise<Pharmacy[]> {
    try {
      if (this.isMockEnabled()) this.throwMockGuard();
      const data = await this.request<Pharmacy[] | { results: Pharmacy[] }>('/pharmacies/availability/', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return Mocks.MOCK_PHARMACIES;
      }
      console.error('Error searching pharmacies by availability:', error);
      throw error;
    }
  }

  // ========== Order Methods ==========

  // Endpoint: POST /checkout/
  async createOrder(formData: FormData): Promise<OrderResponse> {
    try {
      return await this.request<OrderResponse>('/checkout/', {
        method: 'POST',
        headers: { 'Content-Type': 'undefined' },
        body: formData
      }, true);
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return { order_id: 'mock-order-id', success: true, message: 'Commande simulée (mode test)' };
      }
      throw error;
    }
  }

  // Endpoint: POST /officine-order/{orderId}/validate/
  async validateOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request<{ success: boolean; message: string }>(
        `/officine-order/${orderId}/validate/`,
        { method: 'POST' },
        true
      );
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return { success: true, message: 'Commande validée (mode test)' };
      }
      throw error;
    }
  }

  // Endpoint: POST /prescriptions/upload/
  async uploadPrescription(file: File): Promise<{ file_url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      return await this.request<{ file_url: string; id: string }>('/prescriptions/upload/', {
        method: 'POST',
        headers: { 'Content-Type': 'undefined' },
        body: formData
      }, true);
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return { file_url: '#', id: 'mock-prescription-id' };
      }
      throw error;
    }
  }

  // Endpoint: POST /send-presciption-order/{officineId}/validate/
  // Envoie une ordonnance à une pharmacie spécifique
  async sendPrescriptionOrder(
    officineId: string,
    file: File,
    note?: string
  ): Promise<{ success: boolean; message: string; order_id?: string }> {
    const formData = new FormData();
    formData.append('prescription', file);
    if (note) formData.append('note', note);

    try {
      const data = await this.request<{ success?: boolean; status?: boolean; message: string; order_id?: string }>(
        `/send-presciption-order/${officineId}/validate/`,
        { method: 'POST', body: formData },
        true // requires auth
      );
      return {
        success: data.success ?? data.status ?? true,
        message: data.message || 'Ordonnance envoyée avec succès',
        order_id: data.order_id,
      };
    } catch (error) {
      if ((error as ApiError)?.isMockGuard) {
        return { success: true, message: 'Ordonnance envoyée (mode test)' };
      }
      throw error;
    }
  }


  // Endpoint: GET /patient/list_order_patient/ — tous les statuts (PENDING, IN_PICKUP, DELIVERED, CANCELLED…)
  async getMyOrders(status?: string): Promise<OrderListResponse> {
    try {
      const params = status ? `?status=${encodeURIComponent(status)}` : '';
      return await this.request<OrderListResponse>(`/patient/list_order_patient/${params}`, {}, true);
    } catch (error) {
      console.error('[getMyOrders] Erreur backend:', error);
      return { results: [], count: 0, next: null, previous: null };
    }
  }

  // Endpoint: POST /validated-order-by-patient/
  async confirmReception(orderId: string): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>('/validated-order-by-patient/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, status: 'DELIVERED' })
    }, true);
  }

  // Endpoint: POST /dispute-order/
  async reportDispute(orderId: string, reason: string, description: string, photo?: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('order_id', orderId);
    formData.append('reason', reason);
    formData.append('description', description);
    if (photo) formData.append('photo', photo);

    return await this.request<{ success: boolean; message: string }>('/dispute-order/', {
      method: 'POST',
      headers: { 'Content-Type': 'undefined' },
      body: formData
    }, true);
  }

  // ========== Cart Methods ==========

  // Endpoint: GET /patient-cart/ — liste tous les paniers
  async getAllCarts(): Promise<CartResponse[]> {
    try {
      const data = await this.request<CartResponse[] | { results: CartResponse[] }>('/patient-cart/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('[getAllCarts] Erreur:', error);
      return [];
    }
  }

  // Endpoint: GET /patient-cart/get_cart/ — panier du compte connecté
  async getCart(): Promise<CartResponse | APICartItem[]> {
    try {
      return await this.request<CartResponse | APICartItem[]>('/patient-cart/get_cart/', { method: 'GET' }, true);
    } catch (error) {
      // Silencieux si pas encore de panier actif
      const msg = (error instanceof Error ? error.message : '').toLowerCase();
      if (!msg.includes('no active cart') && !(error as ApiError)?.isMockGuard) {
        console.error('[getCart] Erreur:', error);
      }
      return [];
    }
  }

  // Endpoint: GET /patient-cart/{id}/ — lire le panier d'un patient spécifique
  async getCartById(cartId: string): Promise<CartResponse | null> {
    try {
      return await this.request<CartResponse>(`/patient-cart/${cartId}/`, { method: 'GET' }, true);
    } catch (error) {
      console.error('[getCartById] Erreur:', error);
      return null;
    }
  }

  // Endpoint: POST /patient-cart/add_item/ — ajouter un article au panier
  async addToCart(productId: string, quantity: number, pharmacyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.request<{ success?: boolean; message?: string; [key: string]: unknown }>('/patient-cart/add_item/', {
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

  // Endpoint: PATCH /patient-cart/{id}/ — modifier les données d'un panier
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

  // Endpoint: DELETE /patient-cart/{id}/ — supprimer un panier
  async deleteCart(cartId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<unknown>(`/patient-cart/${cartId}/`, { method: 'DELETE' }, true);
      return { success: true, message: 'Panier supprimé' };
    } catch (error) {
      console.error('[deleteCart] Erreur:', error);
      throw error;
    }
  }

  // Endpoint: POST /patient-cart/remove_item/ — retirer un article du panier
  async removeCartItem(itemId: string, quantity = 1): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>('/patient-cart/remove_item/', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, quantity })
    }, true);
  }

  // ========== Notification Methods ==========

  // Endpoint: POST /register-fcm-token/
  async registerFCMToken(token: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/register-fcm-token/', {
      method: 'POST',
      body: JSON.stringify({ token, device_type: 'web' })
    }, true);
  }

  // Endpoint: GET /patient/list_notification_patient/
  async getNotifications(): Promise<AppNotification[]> {
    if (!this.isPatient()) return []; // Notifications réservées aux patients
    try {
      const data = await this.request<AppNotification[] | { notifications: AppNotification[] } | { results: AppNotification[] }>('/patient/list_notification_patient/', { method: 'GET' }, true);
      if (Array.isArray(data)) return data;
      if ('notifications' in data) return data.notifications;
      if ('results' in data) return data.results;
      return [];
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error fetching notifications:', error);
      }
      return [];
    }
  }

  // Endpoint: GET /wallet-patient/get_wallet_patient/
  async getWallet(): Promise<Wallet | null> {
    try {
      const data = await this.request<Wallet | Wallet[] | { results: Wallet[] }>('/wallet-patient/get_wallet_patient/', { method: 'GET' }, true);
      if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
      if ('results' in data && Array.isArray(data.results)) return data.results.length > 0 ? data.results[0] : null;
      return data as Wallet;
    } catch (error) {
      console.error('[getWallet] Erreur backend:', error);
      return null;
    }
  }

  // Endpoint: GET /wallet-patient/transactions/
  async getWalletTransactions(): Promise<AppTransaction[]> {
    try {
      const data = await this.request<AppTransaction[] | { results: AppTransaction[] }>('/wallet-patient/transactions/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('[getWalletTransactions] Erreur backend:', error);
      return [];
    }
  }

  // Endpoint: POST /patient/notification/{id}/mark-read/
  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/patient/notification/${notificationId}/mark-read/`, {
      method: 'POST'
    }, true);
  }

  // ========== Address Methods ==========

  async getAddresses(): Promise<Address[]> {
    try {
      const data = await this.request<Address[] | { results: Address[] }>('/patient/addresses/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error fetching addresses:', error);
      }
      return [...Mocks.MOCK_ADDRESSES] as Address[];
    }
  }

  async createAddress(data: { title: string; address: string }): Promise<{ success: boolean; address: Address }> {
    try {
      return await this.request<{ success: boolean; address: Address }>('/patient/addresses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, true);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error creating address:', error);
      }
      // Mock: simulate creation
      const newAddr: Address = { id: `addr-${Date.now()}`, ...data };
      return { success: true, address: newAddr };
    }
  }

  async updateAddress(id: string, data: { title: string; address: string }): Promise<{ success: boolean; address: Address }> {
    try {
      return await this.request<{ success: boolean; address: Address }>(`/patient/addresses/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, true);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error updating address:', error);
      }
      return { success: true, address: { id, ...data } };
    }
  }

  async deleteAddress(id: string): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>(`/patient/addresses/${id}/`, {
        method: 'DELETE',
      }, true);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error deleting address:', error);
      }
      return { success: true };
    }
  }

  // ========== Payment Method Methods ==========

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const data = await this.request<PaymentMethod[] | { results: PaymentMethod[] }>('/patient/payment-methods/', { method: 'GET' }, true);
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error fetching payment methods:', error);
      }
      return [...Mocks.MOCK_PAYMENT_METHODS] as PaymentMethod[];
    }
  }

  async createPaymentMethod(data: { type: string; phone: string }): Promise<{ success: boolean; payment: PaymentMethod }> {
    try {
      return await this.request<{ success: boolean; payment: PaymentMethod }>('/patient/payment-methods/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, true);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error creating payment method:', error);
      }
      const label = data.type === 'MTN' ? 'Mobile Money (MTN)' : 'Orange Money';
      const newPay: PaymentMethod = { id: `pay-${Date.now()}`, label, isDefault: false, ...data };
      return { success: true, payment: newPay };
    }
  }

  async updatePaymentMethod(id: string, data: { type: string; phone: string }): Promise<{ success: boolean; payment: PaymentMethod }> {
    try {
      return await this.request<{ success: boolean; payment: PaymentMethod }>(`/patient/payment-methods/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, true);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error updating payment method:', error);
      }
      const label = data.type === 'MTN' ? 'Mobile Money (MTN)' : 'Orange Money';
      return { success: true, payment: { id, label, isDefault: false, ...data } };
    }
  }

  async deletePaymentMethod(id: string): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>(`/patient/payment-methods/${id}/`, {
        method: 'DELETE',
      }, true);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error deleting payment method:', error);
      }
      return { success: true };
    }
  }

  async setDefaultPaymentMethod(id: string): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>(`/patient/payment-methods/${id}/set-default/`, {
        method: 'POST',
      }, true);
    } catch (error) {
      if (!(error as ApiError)?.isMockGuard) {
        console.error('Error setting default payment method:', error);
      }
      return { success: true };
    }
  }

  // ========== QR Code Commande (Story 1.1) ==========

  // Endpoint: GET /orders/{order_id}/qr-code/
  async getOrderQrCode(orderId: string): Promise<{ qr_code?: string; qr_code_url?: string; image?: string; [key: string]: unknown }> {
    if (this.isMockEnabled()) {
      return { qr_code: 'MOCK-QR-' + orderId };
    }
    return this.request(`/orders/${orderId}/qr-code/`, {}, true);
  }

  // ========== Facture (Story 1.3) ==========

  // Endpoint: POST /get-invoice-order-patient/
  async getInvoice(orderId: string): Promise<{ id: string; total?: number; total_amount?: number; created_at?: string; [key: string]: unknown }> {
    if (this.isMockEnabled()) {
      return { id: 'mock-invoice-id', total_amount: 5000, created_at: new Date().toISOString() };
    }
    return this.request('/get-invoice-order-patient/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId })
    }, true);
  }

  // Endpoint: GET /get-invoice-order-patient/{invoice_id}/pdf/
  async getInvoicePdf(invoiceId: string): Promise<Blob> {
    const { access } = this.getTokens();
    const response = await fetch(`${API_CONFIG.BASE_URL}/get-invoice-order-patient/${invoiceId}/pdf/`, {
      headers: access ? { Authorization: `Bearer ${access}` } : {}
    });
    if (!response.ok) throw new Error(`Erreur PDF ${response.status}`);
    return response.blob();
  }

  // ========== Notation (Stories 1.4 & 1.5) ==========

  // Endpoint: POST /rating/
  async rateOrder(data: { order_id: string; rating: number; comment?: string }): Promise<{ success: boolean; message: string }> {
    if (this.isMockEnabled()) {
      return { success: true, message: 'Note enregistrée (mode test)' };
    }
    return this.request('/rating/', {
      method: 'POST',
      body: JSON.stringify(data)
    }, true);
  }

  // Endpoint: POST /delivery/review_driver/
  async reviewDriver(data: { delivery_id: string; rating: number; comment?: string }): Promise<{ success: boolean; message: string }> {
    if (this.isMockEnabled()) {
      return { success: true, message: 'Avis enregistré (mode test)' };
    }
    return this.request('/delivery/review_driver/', {
      method: 'POST',
      body: JSON.stringify(data)
    }, true);
  }

  // ========== Horaires Officine (Story 1.6) ==========

  // Endpoint: GET /officine/{id}/schedule/
  async getPharmacySchedule(pharmacyId: string): Promise<{ schedule?: { day: string; opening_time: string; closing_time: string; is_open: boolean }[] }> {
    try {
      return await this.request(`/officine/${pharmacyId}/schedule/`, {}, true);
    } catch {
      return {};
    }
  }

}

export const api = new ApiClient();
