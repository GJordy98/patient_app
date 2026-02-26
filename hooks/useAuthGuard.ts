"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

/**
 * Hook de protection des routes.
 * Redirige vers /login si l'utilisateur n'est pas authentifié.
 */
export function useAuthGuard() {
  const router = useRouter();
  const checked = useRef(false);
  const isAuth = api.isAuthenticated();

  useEffect(() => {
    if (!checked.current) {
      checked.current = true;
      if (!isAuth) {
        router.replace('/login');
      }
    }
  }, [isAuth, router]);

  return { isAuthenticated: isAuth, loading: false };
}
