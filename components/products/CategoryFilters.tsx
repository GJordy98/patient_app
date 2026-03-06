import React from 'react';

interface Category {
  id: string | null;
  name: string;
  icon?: string;
}

interface CategoryFiltersProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory
}) => {
  return (
    <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex gap-3 min-w-max">
        {categories.map((cat) => (
          <button
            key={cat.id || 'all'}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap border-2 ${
              selectedCategoryId === cat.id
                ? 'bg-primary text-white shadow-md border-primary'
                : 'bg-white hover:bg-primary/5 border-gray-100'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilters;
