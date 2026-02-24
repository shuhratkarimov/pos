'use client'

import { Product } from '@/lib/api'
import { ShoppingCart } from 'lucide-react'

interface ProductListProps {
  products: Product[]
  loading: boolean
  onAddToCart: (product: Product) => void
}

export default function ProductList({ products, loading, onAddToCart }: ProductListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-lg p-4 animate-pulse h-48"
          />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="bg-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-400 text-lg">Mahsulot topilmadi</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {products.map((product) => (
        <div
          key={product._id}
          className="bg-gray-200 border border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-gray-900 font-semibold text-lg">{product.name}</h3>
              <p className="text-gray-400 text-sm">Kod: {product.code}</p>
            </div>
            <span className="bg-gray-200 px-2 py-1 rounded text-xs text-gray-300">
              {product.measure}
            </span>
          </div>

          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-gray-400 text-sm">Narxi</p>
              <p className="text-blue-400 text-xl font-bold">
                {product.price.toLocaleString()} so'm
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Ombor</p>
              <p className="text-green-400 text-lg font-semibold">{product.stock}</p>
            </div>
          </div>

          <button
            onClick={() => onAddToCart(product)}
            disabled={product.stock === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <ShoppingCart size={18} />
            Savatchaga qo'sh
          </button>
        </div>
      ))}
    </div>
  )
}
