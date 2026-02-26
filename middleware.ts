import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes publiques accessibles sans authentification
const publicRoutes = [
  '/login',
  '/register',
  '/otp-verification',
  '/forgot-password',
];

// Routes statiques publiques (fichiers, images, etc.)
const publicStaticPaths = [
  '/_next',
  '/favicon.ico',
  '/api',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Autoriser les fichiers statiques et les routes API
  if (publicStaticPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Autoriser les routes publiques
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Vérifier l'authentification via les cookies (seul mécanisme disponible côté serveur)
  const accessToken = request.cookies.get('access_token')?.value ||
                      request.headers.get('authorization')?.replace('Bearer ', '');

  if (!accessToken) {
    // Rediriger vers la page de connexion avec le chemin d'origine comme paramètre redirect
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Utilisateur authentifié, autoriser l'accès
  return NextResponse.next();
}

// Configuration du matcher pour appliquer le middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
