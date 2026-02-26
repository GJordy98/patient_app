import React from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      {/* Main footer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">

          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Logo size={44} variant="full" />
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[260px]">
              Commandez vos médicaments en ligne et recevez-les rapidement directement chez vous.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Navigation</h4>
            <ul className="flex flex-col gap-3">
              {[
                { href: '/', label: 'Accueil' },
                { href: '/pharmacies', label: 'Pharmacies' },
                { href: '/#productsSection', label: 'Catalogue' },
                { href: '/#uploadSection', label: 'Ordonnances' },
                { href: '/orders', label: 'Mes Commandes' },
                { href: '/wallet', label: 'Mon Wallet' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors font-medium"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust badges */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Pourquoi nous choisir</h4>
            <ul className="flex flex-col gap-3">
              {[
                { icon: 'verified', label: 'Pharmacies certifiées' },
                { icon: 'local_shipping', label: 'Livraison rapide à domicile' },
                { icon: 'lock', label: 'Paiement sécurisé' },
                { icon: 'support_agent', label: 'Support 7j/7' },
              ].map(({ icon, label }) => (
                <li key={label} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[15px]">{icon}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            © {year} <span className="font-bold text-primary">e-Dr TIM Pharmacy</span>. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/faq" className="text-xs text-gray-400 hover:text-primary transition-colors">FAQ</Link>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <span className="text-xs text-gray-400">Yaoundé, Cameroun</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
