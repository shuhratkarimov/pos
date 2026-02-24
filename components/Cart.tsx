'use client'

import { CartItem } from '@/lib/api'
import { Trash2, Plus, Minus, FileText } from 'lucide-react'

interface CartProps {
  items: CartItem[]
  onUpdateItem: (_id: string, quantity: number) => void
  onRemoveItem: (_id: string) => void
  onCheckout: () => void
}

export default function Cart({ items, onUpdateItem, onRemoveItem, onCheckout }: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const total = subtotal

  return (
    <div className="sticky top-24 bg-slate-800 border border-slate-700 rounded-lg p-6 max-h-[calc(100vh-120px)] flex flex-col">
      <h2 className="text-white text-xl font-bold mb-4">Savat</h2>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto mb-4">
        {items.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p>Savat bo'sh</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-slate-700 rounded-lg p-3 border border-slate-600"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{item.name}</p>
                    <p className="text-slate-400 text-xs">
                      {item.price.toLocaleString()} so'm / {item.measure}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => onUpdateItem(item.id, item.quantity - 1)}
                    className="bg-slate-600 hover:bg-slate-500 text-white p-1 rounded transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      if (val > 0) onUpdateItem(item.id, val)
                    }}
                    className="w-12 bg-slate-600 text-white text-center rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    onClick={() => onUpdateItem(item.id, item.quantity + 1)}
                    className="bg-slate-600 hover:bg-slate-500 text-white p-1 rounded transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-blue-400 font-semibold text-sm">
                    {item.subtotal.toLocaleString()} so'm
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="border-t border-slate-600 pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Jami:</span>
          <span className="text-white font-semibold">{subtotal.toLocaleString()} so'm</span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        disabled={items.length === 0}
        className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <FileText size={20} />
        Chek Chiqarish
      </button>
    </div>
  )
}
