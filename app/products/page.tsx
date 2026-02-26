'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import {
  Product,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getPotentialProfit,
} from '@/lib/api'
import {
  Plus,
  Edit2,
  Save,
  X,
  Trash2,
  Search,
  Package,
  DollarSign,
  Hash,
  Box,
  AlertCircle,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Download,
  Upload,
  BarChart3,
  SortAsc,
  SortDesc,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Printer
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CSVLink } from "react-csv"
import BarcodeSheet from '@/components/BarcodeSheet'

type SortField = 'name' | 'code' | 'price' | 'boughtPrice' | 'stock' | 'lastUpdated'
type SortDirection = 'asc' | 'desc'

const ITEMS_PER_PAGE = 30

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'out'>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Product>>({})
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [batchAction, setBatchAction] = useState<'delete' | 'update' | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [mounted, setMounted] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement>(null)
  const barcodeRef = useRef<HTMLDivElement>(null)
  const selectedProductsArray = Array.from(selectedProducts).map(id => products.find(p => p._id === id)).filter((p): p is Product => Boolean(p))
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    price: '',
    stock: '',
    measure: 'dona',
    boughtPrice: '',
  })
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [printSize, setPrintSize] = useState<'small' | 'large'>('small')
  const [printMode, setPrintMode] = useState<'individual' | 'a4'>('individual');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [potentialProfit, setPotentialProfit] = useState(0);

  const handleGenerateBarcode = () => {
    const newCode = generateBarcode()

    setFormData(prev => ({
      ...prev,
      code: newCode
    }))
  }

  const handlePrintBarcodes = () => {
    if (selectedProductsArray.length === 0) return;

    const isSmall = printSize === 'small';
    const labelWidthMM = isSmall ? 30 : 40;
    const labelHeightMM = isSmall ? 50 : 60;

    const validProducts = selectedProductsArray
      .filter(p => p.code?.trim())
      .map(p => ({ name: p.name.trim(), code: p.code!.trim() }));

    if (validProducts.length === 0) {
      toast.error('Tanlangan mahsulotlarda barcode kodi yo‘q');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Yangi oynani ochib bo‘lmadi (popup blocker?)');
      return;
    }

    let htmlContent = `
  <!DOCTYPE html>
  <html lang="uz">
  <head>
    <meta charset="UTF-8">
    <title>Barcode chop etish — ${validProducts.length} ta</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <style>
      @page { 
  size: A4 ${printMode === 'a4' ? orientation : 'portrait'}; 
  margin: ${printMode === 'a4' ? '10mm' : '0mm'}; 
}
      body { margin:0; padding:0; font-family:Arial, sans-serif; background:#f9fafb; }
    `;

    if (printMode === 'individual') {
      // Alohida stikerlar — har biri o'z sahifasida yoki bitta sahifada vertikal
      htmlContent += `
      .container { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        gap: 15mm; 
        padding: 10mm; 
      }
      .label { 
        width: ${labelWidthMM}mm; 
        height: ${labelHeightMM}mm; 
        border: 1px solid #e5e7eb; 
        border-radius: 6px; 
        background: white; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        padding: 4mm 3mm; 
        box-shadow: 0 2px 6px rgba(0,0,0,0.1); 
        page-break-after: always; 
      }
      .label svg { width: 92%; height: ${labelHeightMM - 18}mm; }
      .name { margin-top: 4mm; font-size: ${isSmall ? 9 : 11}pt; font-weight: bold; text-align: center; max-width: 100%; line-height: 1.25; }
      `;
    } else {
      // A4 varaq rejimi — grid bilan joylashtirish
      htmlContent += `
      .page { 
        width: 210mm; 
        height: 297mm; 
        box-sizing: border-box; 
        padding: 10mm; 
        display: grid; 
        grid-template-columns: repeat(auto-fit, ${labelWidthMM}mm); 
        grid-auto-rows: ${labelHeightMM}mm; 
        gap: 5mm 7mm; 
        justify-content: center; 
        align-content: start; 
      }
      .label { 
        width: ${labelWidthMM}mm; 
        height: ${labelHeightMM}mm; 
        border: 1px dashed #d1d5db; 
        border-radius: 4px; 
        background: white; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        padding: 3mm 2mm; 
        box-sizing: border-box; 
        page-break-inside: avoid; 
      }
      .label svg { width: 90%; height: ${labelHeightMM - 18}mm; }
      .name { margin-top: 3mm; font-size: ${isSmall ? 8.5 : 10}pt; font-weight: 600; text-align: center; line-height: 1.2; }
      `;
    }

    htmlContent += `
    </style>
  </head>
  <body>
    ${printMode === 'individual' ? '<div class="container">' : '<div class="page">'}
  
      ${validProducts.map((p, i) => `
        <div class="label">
          <svg id="bc-${i}"></svg>
          <div class="name">${p.name}</div>
        </div>
      `).join('')}
  
    </div>
  
    <script>
      ${validProducts.map((p, i) => `
        JsBarcode("#bc-${i}", "${p.code.replace(/"/g, '\\"')}", {
          format: "CODE128",
          width: 2.1,
          height: ${labelHeightMM - 20},
          displayValue: true,
          fontSize: ${isSmall ? 12 : 14},
          margin: 6,
          textMargin: 3,
          textAlign: "center"
        });
      `).join('\n    ')}
  
      setTimeout(() => window.print(), 900);
    </script>
  </body>
  </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setShowBarcodeModal(false);
  };

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    filterAndSortProducts()
    setCurrentPage(1) // Filter o'zgarganda 1-sahifaga qaytish
  }, [products, search, stockFilter, sortField, sortDirection, showLowStock])

  useEffect(() => {
    // Scrollga qarab yangi mahsulotlarni ko'rsatish
    const startIndex = 0
    const endIndex = currentPage * ITEMS_PER_PAGE
    setDisplayedProducts(filteredProducts.slice(0, endIndex))
  }, [filteredProducts, currentPage])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting &&
          !loadingMore &&
          displayedProducts.length < filteredProducts.length) {
          setLoadingMore(true)
          setTimeout(() => {
            setCurrentPage(prev => prev + 1)
            setLoadingMore(false)
          }, 300)
        }
      },
      { threshold: 0.5 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [loadingMore, displayedProducts.length, filteredProducts.length])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await getProducts()
      setProducts(data)
      toast.success('Mahsulotlar yangilandi')
    } catch (error) {
      toast.error('Yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  const loadPotentialProfit = async () => {
    try {
      setLoading(true)
      const data = await getPotentialProfit()
      setPotentialProfit(data.potentialProfit)
    } catch (error) {
      toast.error('Yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPotentialProfit()
  }, [])

  const filterAndSortProducts = () => {
    let filtered = [...products]

    if (search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
      )
    }

    if (stockFilter !== 'all') {
      filtered = filtered.filter(p => {
        switch (stockFilter) {
          case 'low': return p.stock > 0 && p.stock < 10
          case 'medium': return p.stock >= 10 && p.stock < 50
          case 'high': return p.stock >= 50
          case 'out': return p.stock === 0
          default: return true
        }
      })
    }

    if (showLowStock) {
      filtered = filtered.filter(p => p.stock < 10)
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'code':
          aValue = a.code?.toLowerCase() || ''
          bValue = b.code?.toLowerCase() || ''
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'boughtPrice':
          aValue = a.boughtPrice
          bValue = b.boughtPrice
          break
        case 'stock':
          aValue = a.stock
          bValue = b.stock
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredProducts(filtered)
  }

  const handleAddProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Majburiy maydonlarni to\'ldiring')
      return
    }

    try {
      await addProduct({
        name: formData.name,
        code: formData.code?.trim() || undefined,
        price: Number(formData.price),
        stock: Number(formData.stock) || 0,
        measure: formData.measure,
        boughtPrice: Number(formData.boughtPrice),
      })

      toast.success('Mahsulot muvaffaqiyatli qo\'shildi')
      setFormData({
        name: '',
        code: '',
        price: '',
        stock: '',
        measure: 'dona',
        boughtPrice: '',
      })
      setShowForm(false)
      loadProducts()
    } catch (error) {
      toast.error('Qo\'shishda xatolik')
    }
  }

  const handleSaveEdit = async (id: string) => {
    try {
      await updateProduct(id, editForm)
      setEditingId(null)
      setEditForm({})
      toast.success('O\'zgartirishlar saqlandi')
      loadProducts()
    } catch (error) {
      toast.error('Saqlashda xatolik')
    }
  }

  function generateBarcode() {
    return Date.now().toString()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Haqiqatan ham ushbu mahsulotni o\'chirmoqchimisiz?')) return

    try {
      await deleteProduct(id)
      toast.success('Mahsulot o\'chirildi')
      loadProducts()
    } catch (error) {
      toast.error('O\'chirishda xatolik')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Hech qanday mahsulot tanlanmagan')
      return
    }

    if (!confirm(`${selectedProducts.size} ta mahsulotni o'chirmoqchimisiz?`)) return

    try {
      const promises = Array.from(selectedProducts).map(id => deleteProduct(id))
      await Promise.all(promises)
      toast.success(`${selectedProducts.size} ta mahsulot o'chirildi`)
      setSelectedProducts(new Set())
      setBatchAction(null)
      loadProducts()
    } catch (error) {
      toast.error('O\'chirishda xatolik')
    }
  }

  const handleSelectProduct = (id: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedProducts(newSelected)
  }

  const handleSelectAllVisible = () => {
    if (selectedProducts.size === displayedProducts.length) {
      setSelectedProducts(new Set())
    } else {
      const newSelected = new Set(selectedProducts)
      displayedProducts.forEach(p => newSelected.add(p._id))
      setSelectedProducts(newSelected)
    }
  }

  const handleImportCSV = async () => {
    if (!importFile) {
      toast.error('Fayl tanlanmagan')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').slice(1)

        for (const line of lines) {
          if (!line.trim()) continue

          const [name, code, stock, measure, price, boughtPrice] = line.split(',')

          await addProduct({
            name: name.trim() || 'kiritilmagan',
            code: code.trim() || 'kiritilmagan',
            stock: Number(stock.trim()) || 0,
            measure: measure.trim() || 'dona',
            price: Number(price.trim()) || 0,
            boughtPrice: Number(boughtPrice?.trim()) || 0,
          })
        }

        toast.success('Mahsulotlar muvaffaqiyatli import qilindi')
        setShowImport(false)
        setImportFile(null)
        loadProducts()
      } catch (error) {
        toast.error('Import qilishda xatolik')
      }
    }

    reader.readAsText(importFile)
  }

  const getStats = useMemo(() => {
    const total = products.length
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)
    const lowStock = products.filter(p => p.stock < 10).length
    const outOfStock = products.filter(p => p.stock === 0).length
    const averagePrice = total > 0 ? products.reduce((sum, p) => sum + p.price, 0) / total : 0

    // Yangi: potentsial foyda
    const potentialProfit = products.reduce((sum, p) => {
      const profitPerUnit = (p.price || 0) - (p.boughtPrice || 0)
      return sum + (profitPerUnit * (p.stock || 0))
    }, 0)

    return {
      total,
      totalStock,
      totalValue,
      lowStock,
      outOfStock,
      averagePrice,
      potentialProfit,
    }
  }, [products])

  const getStockColor = (stock: number) => {
    if (stock === 0) return 'bg-red-100 text-red-700 border-red-200'
    if (stock < 10) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    if (stock < 50) return 'bg-blue-100 text-blue-700 border-blue-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  const getStockText = (stock: number) => {
    if (stock === 0) return 'Tugagan'
    if (stock < 10) return 'Kam qolgan'
    if (stock < 50) return 'O\'rtacha'
    return 'Ko\'p'
  }

  const exportData = [
    ['Nomi', 'Kodi', 'Narxi', 'Ombor', 'O\'lchov', 'Sotib olish narxi'],
    ...products.map(p => [
      p.name,
      p.code,
      p.price,
      p.stock,
      p.measure,
      p.boughtPrice,
    ])
  ]

  const SortHeader = ({ field, label }: { field: SortField, label: string }) => (
    <button
      onClick={() => {
        if (sortField === field) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
          setSortField(field)
          setSortDirection('asc')
        }
      }}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors font-medium"
    >
      {label}
      {sortField === field && (
        sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div style={{ display: 'none' }} ref={barcodeRef}>
        <BarcodeSheet products={selectedProductsArray} size="small" />
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-teal-600 rounded-xl shadow">
                  <Package className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Mahsulotlar boshqaruvi
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Barcha mahsulotlarni qo'shish, tahrirlash va nazorat qilish
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              {mounted && (
                <CSVLink
                  data={exportData}
                  filename={`mahsulotlar-${new Date().toISOString().split('T')[0]}.csv`}
                  className="px-4 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl text-gray-700 flex items-center gap-2 transition-all shadow-sm hover:shadow"
                >
                  <Download size={18} />
                  Export
                </CSVLink>
              )}
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl text-gray-700 flex items-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <Upload size={18} />
                Import
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-3 transition-all shadow hover:shadow-md"
              >
                <Plus size={20} />
                Yangi mahsulot
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Jami mahsulot</p>
                  <p className="text-2xl font-bold text-gray-900">{getStats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="text-blue-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Jami Qiymati</p>
                  <p className="text-2xl font-bold text-gray-900">{getStats.totalValue.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">so'm</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="text-green-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Potentsial foyda</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {getStats.potentialProfit.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-xs">so'm (hammasi sotilsa)</p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <TrendingUp className="text-emerald-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Kam qolgan</p>
                  <p className="text-2xl font-bold text-gray-900">{getStats.lowStock}</p>
                  <p className="text-gray-500 text-xs">ta mahsulot</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="text-yellow-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tugagan</p>
                  <p className="text-2xl font-bold text-gray-900">{getStats.outOfStock}</p>
                  <p className="text-gray-500 text-xs">ta mahsulot</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <Box className="text-red-600" size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 lg:gap-4">
            {/* Search */}
            <div className="flex-1 relative mb-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Mahsulot nomi yoki kodi bo'yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
                className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="all">Barcha ombor</option>
                <option value="out">Tugagan</option>
                <option value="low">Kam qolgan</option>
                <option value="medium">O'rtacha</option>
                <option value="high">Ko'p</option>
              </select>

              <button
                onClick={() => setShowLowStock(!showLowStock)}
                className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all ${showLowStock
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
              >
                <AlertCircle size={18} />
                Kam qolgan
              </button>

              <button
                onClick={loadProducts}
                className="px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-gray-700 flex items-center gap-2 transition-all"
              >
                <RefreshCw size={18} />
                Yangilash
              </button>
            </div>
          </div>

          {/* Batch Actions */}
          {selectedProducts.size > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="text-blue-600" size={20} />
                  <span className="text-gray-900 font-medium">
                    {selectedProducts.size} ta mahsulot tanlandi
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleBatchDelete}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors border border-red-200"
                  >
                    Tanlanganlarni o'chirish
                  </button>
                  <button
                    onClick={() => setSelectedProducts(new Set())}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Product Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Plus className="text-blue-600" size={24} />
                <h2 className="text-2xl font-bold text-gray-900">Yangi Mahsulot Qo'shish</h2>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="text-gray-500" size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Nomi
                  </label>
                  <input
                    placeholder="Mahsulot nomi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode (ixtiyoriy)
                  </label>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        placeholder="Barcode kiriting yoki generatsiya qiling"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, code: generateBarcode() })
                      }
                      className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-medium transition-all border border-blue-200"
                    >
                      Generatsiya
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Narxi
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">so'm</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sotib olish narxi
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">so'm</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.boughtPrice}
                      onChange={(e) => setFormData({ ...formData, boughtPrice: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ombor Soni
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    O'lchov Birligi
                  </label>
                  <select
                    value={formData.measure}
                    onChange={(e) => setFormData({ ...formData, measure: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="dona">dona</option>
                    <option value="kg">kg</option>
                    <option value="litr">litr</option>
                    <option value="quti">quti</option>
                    <option value="metr">metr</option>
                    <option value="paket">paket</option>
                    <option value="gacha">gacha</option>
                    <option value="m2">m²</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddProduct}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow hover:shadow-md"
              >
                <Save size={18} />
                Saqlash
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg sm:max-w-md p-4 sm:p-6 border border-gray-300 shadow-2xl">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">CSV Import Qilish</h3>
                  <button
                    onClick={() => {
                      setShowImport(false)
                      setImportFile(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="text-gray-500" size={20} />
                  </button>
                </div>
                <p className="text-gray-600 text-sm mt-2">
                  CSV fayl format: Nomi, Kodi, Narxi, Ombor, O'lchov, Sotib olish narxi
                </p>
              </div>

              <div className="p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  {importFile ? (
                    <div>
                      <Package className="mx-auto text-blue-600 mb-2" size={32} />
                      <p className="text-gray-900 font-medium">{importFile.name}</p>
                      <p className="text-gray-500 text-sm">
                        {(importFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-gray-500">CSV faylni bu yerga torting yoki tanlang</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-block mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors border border-gray-300"
                  >
                    Fayl Tanlash
                  </label>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleImportCSV}
                    disabled={!importFile}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-all shadow-sm hover:shadow"
                  >
                    Import Qilish
                  </button>
                  <button
                    onClick={() => {
                      setShowImport(false)
                      setImportFile(null)
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-bold transition-colors"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="text-blue-600" size={24} />
                <h2 className="text-2xl font-bold text-gray-900">Mahsulotlar Ro'yxati</h2>
              </div>
              <div className="text-sm text-gray-600">
                {displayedProducts.length} / {filteredProducts.length} ta mahsulot ({products.length} dan)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold w-12">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === displayedProducts.length && displayedProducts.length > 0}
                      onChange={handleSelectAllVisible}
                      className="rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold">
                    <SortHeader field="name" label="Mahsulot Nomi" />
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold">
                    <SortHeader field="code" label="Kodi" />
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold">
                    <SortHeader field="price" label="Narxi" />
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold">
                    <SortHeader field="stock" label="Ombor" />
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold">O'lchov</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold">
                    <SortHeader field="boughtPrice" label="Olingan narx" />
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold">Harakatlar</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 sm:px-4 py-2 sm:py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                      </div>
                      <p className="mt-4 text-gray-400">Mahsulotlar yuklanmoqda...</p>
                    </td>
                  </tr>
                ) : displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 sm:px-4 py-2 sm:py-4 text-center">
                      <Package className="mx-auto text-gray-300 mb-4" size={48} />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">Mahsulotlar topilmadi</h3>
                      <p className="text-gray-500">
                        {search ? 'Boshqa qidiruv so\'zini kiriting' : 'Birinchi mahsulotni qo\'shing'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((p) => (
                    <tr
                      key={p._id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(p._id)}
                          onChange={() => handleSelectProduct(p._id)}
                          className="rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Name */}
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        {editingId === p._id ? (
                          <input
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        ) : (
                          <div>
                            <div className="font-medium text-gray-900">{p.name}</div>
                          </div>
                        )}
                      </td>

                      {/* Code */}
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        {editingId === p._id ? (
                          <div className="flex gap-2">
                            <input
                              value={editForm.code || ''}
                              onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                              placeholder="Barcode"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setEditForm({ ...editForm, code: generateBarcode() })
                              }
                              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg"
                            >
                              Generatsiya
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Hash size={14} className="text-gray-400" />
                            {p.code ? (
                              <span className="font-mono text-gray-700">{p.code}</span>
                            ) : (
                              <span className="text-gray-400 italic">Barcode yo‘q</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        {editingId === p._id ? (
                          <div className="relative">
                            <input
                              type="number"
                              value={editForm.price || 0}
                              onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                              className="w-full sm:w-32 pl-8 pr-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">so'm</span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-green-600 font-semibold">{p.price.toLocaleString()}</div>
                            <div className="text-gray-500 text-xs">so'm</div>
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        {editingId === p._id ? (
                          <input
                            type="number"
                            value={editForm.stock || 0}
                            onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                            className="w-full sm:w-32 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        ) : (
                          <div>
                            <div className={`font-semibold ${p.stock < 10 ? 'text-red-600' : p.stock < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {p.stock.toLocaleString()}
                            </div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${getStockColor(p.stock)} border`}>
                              {getStockText(p.stock)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Measure */}
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        {editingId === p._id ? (
                          <select
                            value={editForm.measure}
                            onChange={(e) => setEditForm({ ...editForm, measure: e.target.value })}
                            className="w-full sm:w-32 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          >
                            <option value="dona">dona</option>
                            <option value="kg">kg</option>
                            <option value="litr">litr</option>
                            <option value="quti">quti</option>
                            <option value="metr">metr</option>
                            <option value="paket">paket</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {p.measure}
                          </span>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        {editingId === p._id ? (
                          <div className="relative">
                            <input
                              type="number"
                              value={editForm.boughtPrice || 0}
                              onChange={(e) => setEditForm({ ...editForm, boughtPrice: Number(e.target.value) })}
                              className="w-full sm:w-32 pl-8 pr-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">so'm</span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-yellow-600 font-semibold">{p.boughtPrice?.toLocaleString()}</div>
                            <div className="text-gray-500 text-xs">so'm</div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        <div className="flex items-center gap-2 overflow-x-auto">
                          {editingId === p._id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(p._id)}
                                className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors border border-green-200"
                                title="Saqlash"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null)
                                  setEditForm({})
                                }}
                                className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                                title="Bekor qilish"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingId(p._id)
                                  setEditForm(p)
                                }}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors border border-blue-200"
                                title="Tahrirlash"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(p._id)}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors border border-red-200"
                                title="O'chirish"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Loading More Indicator */}
            {displayedProducts.length > 0 && displayedProducts.length < filteredProducts.length && (
              <div ref={observerTarget} className="py-6 text-center">
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Yana mahsulotlar yuklanmoqda...</span>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    Pastga tushing yoki kuting...
                  </div>
                )}
              </div>
            )}

            {/* End of List */}
            {displayedProducts.length > 0 && displayedProducts.length === filteredProducts.length && (
              <div className="py-6 text-center border-t border-gray-200">
                <div className="text-gray-500 text-sm">
                  Barcha {filteredProducts.length} ta mahsulot ko'rsatilmoqda
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 text-sm text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              Jami {displayedProducts.length} ta mahsulot ({filteredProducts.length} dan)
              {search && <span className="ml-2">• "{search}" bo'yicha qidiruv natijalari</span>}
              {displayedProducts.length < filteredProducts.length && (
                <span className="ml-2">• Yana {filteredProducts.length - displayedProducts.length} ta mahsulot mavjud</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span>Tugagan / Kam qolgan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>O'rtacha ombor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>Ko'p ombor</span>
              </div>
            </div>
          </div>
        </div>
        {/* Fixed Barcode Print Button */}
        {selectedProducts.size > 0 && (
          <button
            onClick={() => setShowBarcodeModal(true)}
            className="fixed bottom-8 right-8 px-7 py-4 bg-teal-600 text-white rounded-3xl font-bold flex items-center gap-3 shadow-2xl hover:bg-teal-700 transition-all z-50"
          >
            <Printer size={22} />
            Barcode chop etish ({selectedProducts.size})
          </button>
        )}
      </main>
      {/* ====================== BARCODE PRINT MODAL ====================== */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[100] p-4 sm:p-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md sm:max-w-xl max-h-[96vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

            {/* Header – ixchamroq */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                  <Printer className="text-blue-600" size={26} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">Barcode chop etish</h3>
                  <p className="text-gray-500 text-sm">
                    {selectedProducts.size} ta mahsulot
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-700 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Body – kamroq joy egallashi uchun */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">

              {/* O‘lcham tanlash */}
              <div>
                <p className="text-sm text-gray-600 mb-2.5">O‘lcham:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrintSize('small')}
                    className={`p-4 rounded-xl border-2 text-center transition-all text-sm ${printSize === 'small'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="font-bold">Kichik</div>
                    <div className="text-xs text-gray-500 mt-0.5">30 × 50 mm</div>
                  </button>

                  <button
                    onClick={() => setPrintSize('large')}
                    className={`p-4 rounded-xl border-2 text-center transition-all text-sm ${printSize === 'large'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="font-bold">Katta</div>
                    <div className="text-xs text-gray-500 mt-0.5">40 × 60 mm</div>
                  </button>
                </div>
              </div>

              {/* Chop etish usuli */}
              <div>
                <p className="text-sm text-gray-600 mb-2.5">Usul:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrintMode('individual')}
                    className={`p-4 rounded-xl border-2 text-left transition-all text-sm ${printMode === 'individual'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="font-semibold">Alohida stikerlar</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Har biri alohida sahifada
                    </div>
                  </button>

                  <button
                    onClick={() => setPrintMode('a4')}
                    className={`p-4 rounded-xl border-2 text-left transition-all text-sm ${printMode === 'a4'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="font-semibold">A4 varaqqa</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Bir varaqqa ko‘p joylashtirish
                    </div>
                  </button>
                </div>
              </div>

              {/* Yangi: Sahifa yo‘nalishi (orientation) – faqat A4 rejimida faol */}
              {printMode === 'a4' && (
                <div>
                  <p className="text-sm text-gray-600 mb-2.5">Sahifa yo‘nalishi:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`p-4 rounded-xl border-2 text-center transition-all text-sm ${orientation === 'portrait'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="font-semibold">Kitob (Portrait)</div>
                      <div className="text-xs text-gray-500 mt-0.5">Vertikal</div>
                    </button>

                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`p-4 rounded-xl border-2 text-center transition-all text-sm ${orientation === 'landscape'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="font-semibold">Albom (Landscape)</div>
                      <div className="text-xs text-gray-500 mt-0.5">Gorizontal</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Oldindan ko'rish – ixchamroq */}
              <div>
                <p className="text-sm text-gray-600 mb-2.5">Oldindan ko‘rish (birinchi 6 ta):</p>
                <div className="bg-gray-100 border rounded-xl p-4 max-h-[180px] sm:max-h-[260px] overflow-auto flex justify-center items-center">
                  <BarcodeSheet
                    products={selectedProductsArray.slice(0, 6)}
                    size={printSize}
                  />
                </div>
                {selectedProductsArray.length > 6 && (
                  <p className="text-center text-xs text-gray-500 mt-2">
                    + yana {selectedProductsArray.length - 6} ta...
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-4 flex gap-3 bg-white">
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handlePrintBarcodes}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Chop etish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}