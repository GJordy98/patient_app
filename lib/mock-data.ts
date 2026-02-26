export const MOCK_CATEGORIES = [
  { id: '1', name: 'Antibiotiques', slug: 'antibiotiques' },
  { id: '2', name: 'Analgésiques', slug: 'analgesiques' },
  { id: '3', name: 'Vitamines', slug: 'vitamines' },
  { id: '4', name: 'Soin de la peau', slug: 'soin-peau' },
  { id: '5', name: 'Hygiène', slug: 'hygiene' },
];

export const MOCK_PHARMACIES = [
  {
    id: 'pharma-1',
    name: 'Pharmacie du Soleil',
    address: 'Place Akwa, Douala',
    quartier: 'Akwa',
    latitude: 4.0511,
    longitude: 9.7042,
    phone: '+237 699 00 11 22',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'pharma-2',
    name: 'Pharmacie de la Paix',
    address: 'Bastos, Yaoundé',
    quartier: 'Bastos',
    latitude: 3.8480,
    longitude: 11.5021,
    phone: '+237 677 33 44 55',
    image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=400&q=80'
  }
];

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Paracétamol 500mg',
    price: 1500,
    category: '2',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    description: 'Efficace contre la douleur et la fièvre.',
    manufacturer: 'Generic Pharma'
  },
  {
    id: 'prod-2',
    name: 'Amoxicilline 500mg',
    price: 3500,
    category: '1',
    image: 'https://images.unsplash.com/photo-1550572017-ed20c2d32ec0?auto=format&fit=crop&w=400&q=80',
    description: 'Antibiotique à large spectre.',
    manufacturer: 'PharmaPlus'
  },
  {
    id: 'prod-3',
    name: 'Vitamine C 1000mg',
    price: 2500,
    category: '3',
    image: 'https://images.unsplash.com/photo-1563456874146-465503c399d9?auto=format&fit=crop&w=400&q=80',
    description: 'Complément alimentaire pour la vitalité.',
    manufacturer: 'Wellness Labs'
  },
  {
    id: 'prod-4',
    name: 'Crème Hydratante Apaisante',
    price: 4500,
    category: '4',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=400&q=80',
    description: 'Idéal pour les peaux sèches et sensibles.',
    manufacturer: 'DermoCare'
  }
];

export const MOCK_PHARMACY_PRODUCTS = MOCK_PRODUCTS.map(p => ({
  id: `cp-${p.id}`,
  product: p,
  officine_detail: MOCK_PHARMACIES[0],
  quantity: Math.floor(Math.random() * 50) + 10,
  sale_price: p.price
}));

export const MOCK_WALLET = {
  id: 'wallet-1',
  balance: 25000,
  locked_amount: 5000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const MOCK_TRANSACTIONS = [
  {
    id: 'tx-1',
    type: 'DEBIT',
    amount: 1500,
    status: 'COMPLETED',
    description: 'Achat Paracétamol 500mg',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    reference: 'ORD-12345'
  },
  {
    id: 'tx-2',
    type: 'CREDIT',
    amount: 10000,
    status: 'COMPLETED',
    description: 'Rechargement Orange Money',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    reference: 'REF-7890'
  },
  {
    id: 'tx-3',
    type: 'DEBIT',
    amount: 3500,
    status: 'PENDING',
    description: 'Commande Amoxicilline en cours',
    created_at: new Date().toISOString(),
    reference: 'ORD-67890'
  }
];

export const MOCK_ADDRESSES = [
  {
    id: 'addr-1',
    title: 'Maison',
    address: 'Ange Raphael, Douala',
  },
  {
    id: 'addr-2',
    title: 'Bureau',
    address: 'Bonanjo, Douala',
  },
];

export const MOCK_PAYMENT_METHODS = [
  {
    id: 'pay-1',
    type: 'MTN',
    label: 'Mobile Money (MTN)',
    phone: '+237 699 00 11 22',
    isDefault: true,
  },
  {
    id: 'pay-2',
    type: 'Orange',
    label: 'Orange Money',
    phone: '+237 677 33 44 55',
    isDefault: false,
  },
];

export const MOCK_ORDERS = [
  {
    id: 'ord-a1b2c3d4',
    order_id: 'ORD-001',
    status: 'PENDING',
    total_amount: 5000,
    pharmacy: 'pharma-1',
    pharmacy_name: 'Pharmacie du Soleil',
    code_reception: '482917',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    items: [
      { product_name: 'Paracétamol 500mg', quantity: 2, total_price: 3000 },
      { product_name: 'Vitamine C 1000mg', quantity: 1, total_price: 2000 },
    ],
  },
  {
    id: 'ord-e5f6g7h8',
    order_id: 'ORD-002',
    status: 'DELIVERY',
    total_amount: 7500,
    pharmacy: 'pharma-1',
    pharmacy_name: 'Pharmacie du Soleil',
    code_reception: '739261',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    pharmacy_latitude: 4.0511,
    pharmacy_longitude: 9.7042,
    patient_latitude: 4.0611,
    patient_longitude: 9.7142,
    items: [
      { product_name: 'Amoxicilline 500mg', quantity: 1, total_price: 3500 },
      { product_name: 'Crème Hydratante', quantity: 1, total_price: 4000 },
    ],
  },
  {
    id: 'ord-i9j0k1l2',
    order_id: 'ORD-003',
    status: 'COMPLETED',
    total_amount: 1500,
    pharmacy: 'pharma-2',
    pharmacy_name: 'Pharmacie de la Paix',
    code_reception: '156843',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    items: [
      { product_name: 'Paracétamol 500mg', quantity: 1, total_price: 1500 },
    ],
  },
  {
    id: 'ord-m3n4o5p6',
    order_id: 'ORD-004',
    status: 'PROCESSING',
    total_amount: 12000,
    pharmacy: 'pharma-1',
    pharmacy_name: 'Pharmacie du Soleil',
    code_reception: '924710',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    items: [
      { product_name: 'Amoxicilline 500mg', quantity: 2, total_price: 7000 },
      { product_name: 'Vitamine C 1000mg', quantity: 2, total_price: 5000 },
    ],
  },
  {
    id: 'ord-q7r8s9t0',
    order_id: 'ORD-005',
    status: 'CANCELLED',
    total_amount: 3500,
    pharmacy: 'pharma-2',
    pharmacy_name: 'Pharmacie de la Paix',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    items: [
      { product_name: 'Amoxicilline 500mg', quantity: 1, total_price: 3500 },
    ],
  },
];
