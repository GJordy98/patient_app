import React from 'react';
import PharmacyGrid from '@/components/pharmacies/PharmacyGrid';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Toutes les Pharmacies - e-Dr Tim Pharmacy',
  description: 'Découvrez les pharmacies disponibles près de chez vous',
};

const PharmacyListPage = () => {
  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-[#22C55E] mb-6 transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Retour Accueil</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-gray-900">Toutes les Pharmacies</h1>
          <p className="text-gray-600">Découvrez les pharmacies disponibles près de chez vous</p>
        </div>

        <PharmacyGrid />
      </main>
      <Footer />
    </>
  );
};

export default PharmacyListPage;
