'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import {
  Product,
  addProduct,
  getProducts,
  getProductStatsAPI,
  updateProduct,
  deleteProduct,
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const observerTarget = useRef<HTMLDivElement>(null)
  const barcodeRef = useRef<HTMLDivElement>(null)
  const selectedProductsArray = Array.from(selectedProducts).map(id => products.find(p => p._id === id)).filter((p): p is Product => Boolean(p))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [formData, setFormData] = useState({
    _id: '',
    name: '',
    code: '',
    price: 0,
    stock: 0,
    measure: 'dona',
    boughtPrice: 0,
  })
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [printSize, setPrintSize] = useState<'small' | 'large'>('small')
  const [printMode, setPrintMode] = useState<'individual' | 'a4'>('individual');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [productStats, setProductStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    potentialProfit: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValue: 0,
  });
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<"idle" | "processing" | "done">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const openAddModal = () => {
    setFormData({
      _id: '',
      name: '',
      code: '',
      price: 0,
      stock: 0,
      measure: 'dona',
      boughtPrice: 0,
    })
    setModalMode('add')
    setIsModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setFormData({
      _id: product._id,
      name: product.name,
      code: product.code!,
      price: product.price!,
      stock: product.stock!,
      measure: product.measure,
      boughtPrice: product.boughtPrice!,
    })
    setModalMode('edit')
    setIsModalOpen(true)
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
    setMounted(true)
  }, [])

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  };

  const loadProducts = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setProducts([]);
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const response = await getProducts({
        page: isLoadMore ? page + 1 : 1,
        limit: ITEMS_PER_PAGE,
        search: search || undefined,
        stockFilter: stockFilter === 'all' ? undefined : stockFilter,
        sortField,
        sortDirection,
      });

      const newProducts = response.products || [];

      setProducts(prev => isLoadMore ? [...prev, ...newProducts] : newProducts);
      setTotalProducts(response.total || 0);
      setHasMore(response.hasMore || false);
      setPage(prev => isLoadMore ? prev + 1 : 1);

      if (!isLoadMore && !search && !stockFilter) {
        toast.success('Mahsulotlar yangilandi');
      }
    } catch (error) {
      toast.error('Yuklashda xatolik');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, stockFilter, sortField, sortDirection]);

  useEffect(() => {
    loadProducts(false);
  }, [loadProducts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (
          entries[0].isIntersecting &&
          !loadingMore &&
          hasMore &&
          !loading
        ) {
          loadProducts(true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadingMore, hasMore, loading, loadProducts]);

  useEffect(() => {
    loadProducts(false);
  }, [search, stockFilter, sortField, sortDirection]);

  const loadProductStats = async () => {
    try {
      setLoading(true)
      const data = await getProductStatsAPI()
      setProductStats(data)
    } catch (error) {
      toast.error('Yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProductStats();
  }, []);

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.price) {
      toast.error('Nomi va narx majburiy!')
      return
    }

    try {
      if (modalMode === 'add') {
        await addProduct({
          name: formData.name.trim(),
          code: formData.code?.trim() || undefined,
          price: Number(formData.price),
          stock: Number(formData.stock) || 0,
          measure: formData.measure || 'dona',
          boughtPrice: Number(formData.boughtPrice) || 0,
        })
        toast.success('Mahsulot qo‘shildi ✓')
      } else if (modalMode === 'edit' && formData._id) {
        await updateProduct(formData._id, {
          name: formData.name.trim(),
          code: formData.code?.trim(),
          price: Number(formData.price),
          stock: Number(formData.stock),
          measure: formData.measure,
          boughtPrice: Number(formData.boughtPrice),
        })
        toast.success('O‘zgartirishlar saqlandi ✓')
      }

      setIsModalOpen(false)
      loadProducts(false)
      loadProductStats()
    } catch (err) {
      toast.error('Saqlashda xatolik')
      console.error(err)
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
      loadProductStats()
    } catch (error) {
      toast.error('O\'chirishda xatolik')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Hech qanday mahsulot tanlanmagan')
      return
    }

    try {
      const promises = Array.from(selectedProducts).map(id => deleteProduct(id))
      await Promise.all(promises)
      toast.success(`${selectedProducts.size} ta mahsulot o'chirildi`)
      setSelectedProducts(new Set())
      setBatchAction(null)
      loadProducts()
      loadProductStats()
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
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      const newSelected = new Set(selectedProducts)
      products.forEach(p => newSelected.add(p._id))
      setSelectedProducts(newSelected)
    }
  }

  const handleImportCSV = async () => {
    if (!importFile) {
      toast.error('Fayl tanlanmagan');
      return;
    }

    setImportProgress(0);
    setImportStatus('processing');
    setImportMessage('Fayl o‘qilmoqda...');
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').slice(1);

        const productsToSend = lines
          .filter(line => line.trim())
          .map(line => {
            const [name, code, price, stock, measure, boughtPrice] = line.split(',');
            return {
              name: name?.trim() || 'kiritilmagan',
              code: code?.trim(),
              price: price?.trim(),
              stock: stock?.trim(),
              measure: measure?.trim() || 'dona',
              boughtPrice: boughtPrice?.trim()
            };
          });

        if (productsToSend.length === 0) {
          throw new Error('Faylda ma‘lumot topilmadi');
        }

        setImportMessage(`Jami ${productsToSend.length} ta mahsulot yuklanmoqda...`);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/import-csv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Agar autentifikatsiya kerak bo'lsa: 'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ products: productsToSend }),
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Server xatosi: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Javob tanasi yo‘q');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // oxirgi to‘liqsiz qatorni saqlab qolamiz

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue; // agar backend shunday yuborsa

            try {
              const data = JSON.parse(dataStr);

              setImportProgress(data.progress ?? 0);
              setImportMessage(data.message ?? 'Jarayon davom etmoqda...');

              if (data.errors) {
                setImportErrors(data.errors);
              }

              if (data.finished) {
                setImportStatus('done');
                toast.success(`${data.success} ta mahsulot qo‘shildi`);
                if (data.errorsList?.length) {
                  toast.error(`${data.errorsList.length} ta xato`);
                }
                loadProducts();
                setTimeout(() => {
                  setShowImport(false);
                  setImportFile(null);
                  setImportProgress(0);
                  setImportStatus('idle');
                }, 2000);
                return; // yakunlash
              }
            } catch (parseErr) {
              console.warn('SSE parsing xatosi:', parseErr, dataStr);
            }
          }
        }

        // agar server to‘satdan yopilsa
        setImportStatus('idle');
        toast.error('Import jarayoni to‘xtadi');

      } catch (err: any) {
        if (err.name === 'AbortError') {
          toast.success('Import bekor qilindi');
        } else {
          toast.error(err.message || 'Importda xatolik');
        }
        setImportStatus('idle');
      }
    };

    reader.readAsText(importFile);
  };

  // Bekor qilish tugmasi uchun
  const cancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setImportStatus("idle");
    setImportProgress(0);
    setShowImport(false);
  };

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
                  className="px-4 py-3 bg-white hover:cursor-pointer hover:bg-gray-50 border border-gray-300 rounded-xl text-gray-700 flex items-center gap-2 transition-all shadow-sm hover:shadow"
                >
                  <Upload size={18} />
                  Export
                </CSVLink>
              )}
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-3 bg-white hover:cursor-pointer hover:bg-gray-50 border border-gray-300 rounded-xl text-gray-700 flex items-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <Download size={18} />
                Import
              </button>
              <button
                onClick={() => openAddModal()}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-3 transition-all shadow hover:shadow-md"
              >
                <Plus size={20} />
                Yangi mahsulot
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            {/* Jami mahsulot turi */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-600 text-sm font-medium">Jami mahsulot turi</p>
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <Package className="text-blue-600" size={18} />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-2xl font-bold text-gray-900 truncate">{productStats.totalProducts?.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs mt-1">ta</p>
                </div>
              </div>
            </div>

            {/* Jami miqdori */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-600 text-sm font-medium">Jami miqdori</p>
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <Package className="text-blue-600" size={18} />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-2xl font-bold text-gray-900 truncate">{productStats.totalStock?.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs mt-1">dona, metr, kg...</p>
                </div>
              </div>
            </div>

            {/* Jami qiymati */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-600 text-sm font-medium">Jami qiymati</p>
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <DollarSign className="text-green-600" size={18} />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-2xl font-bold text-gray-900 truncate">{formatNumber(productStats.totalValue)}</p>
                  <p className="text-gray-500 text-xs mt-1">so'm</p>
                </div>
              </div>
            </div>

            {/* Potentsial foyda */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-600 text-sm font-medium">Potentsial foyda</p>
                  <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                    <TrendingUp className="text-emerald-600" size={18} />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-2xl font-bold text-emerald-700 truncate">{formatNumber(productStats.potentialProfit)}</p>
                  <p className="text-gray-500 text-xs mt-1">so'm (hammasi sotilsa)</p>
                </div>
              </div>
            </div>

            {/* Kam qolgan */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-600 text-sm font-medium">Kam qolgan</p>
                  <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                    <AlertCircle className="text-yellow-600" size={18} />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-2xl font-bold text-gray-900 truncate">{productStats.lowStockCount}</p>
                  <p className="text-gray-500 text-xs mt-1">ta mahsulot</p>
                </div>
              </div>
            </div>

            {/* Tugagan */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-600 text-sm font-medium">Tugagan</p>
                  <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                    <Box className="text-red-600" size={18} />
                  </div>
                </div>
                <div className="mt-auto">
                  <p className="text-2xl font-bold text-gray-900 truncate">{productStats.outOfStockCount}</p>
                  <p className="text-gray-500 text-xs mt-1">ta mahsulot</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Mahsulot nomi yoki kodi bo'yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all hover:border-gray-300"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:min-w-[400px] lg:min-w-[500px]">
              {/* Stock filter */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer hover:border-gray-300"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25rem',
                }}
              >
                <option value="all">Barcha ombor</option>
                <option value="out">Tugagan</option>
                <option value="low">Kam qolgan</option>
                <option value="medium">O'rtacha</option>
                <option value="high">Ko'p</option>
              </select>

              <button
                onClick={() => {
                  setStockFilter(prev => prev === 'low' ? 'all' : 'low');
                }}
                className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all whitespace-nowrap min-w-[130px] ${stockFilter === 'low'
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
              >
                <AlertCircle
                  size={18}
                  className={stockFilter === 'low' ? 'text-red-600' : 'text-gray-500'}
                />
                <span className="font-medium">Kam qolgan</span>
                {stockFilter === 'low' && (
                  <span className="ml-1 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                    faol
                  </span>
                )}
              </button>

              {/* Refresh button */}
              <button
                onClick={() => loadProducts()}
                className="px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 flex items-center justify-center gap-2 transition-all whitespace-nowrap min-w-[110px] hover:border-gray-300 active:scale-95"
              >
                <RefreshCw size={18} className="text-gray-500" />
                <span className="font-medium">Yangilash</span>
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
        {
          showForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Plus className="text-blue-600" size={24} />
                  <h2 className="text-2xl font-bold text-gray-900">Yangi mahsulot qo'shish</h2>
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
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
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
                        onChange={(e) => setFormData({ ...formData, boughtPrice: Number(e.target.value) })}
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
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
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
                  onClick={handleSave}
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
          )
        }

        {
          showImport && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg sm:max-w-md p-6 border border-gray-300 shadow-2xl overflow-y-auto max-h-[90vh]">

                {/* Header */}
                <div className="border-b border-gray-200 pb-3 mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">CSV import qilish</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      CSV format: Nomi, Kodi, Narxi, Ombor, O'lchov, Sotib olish narxi
                    </p>
                  </div>
                  <button
                    disabled={importStatus === "processing"}
                    onClick={() => { setShowImport(false); setImportFile(null); }}
                    className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${importStatus === "processing" ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <X className="text-gray-500" size={20} />
                  </button>
                </div>

                {/* Drag & Drop */}
                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type === "text/csv") setImportFile(file);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-teal-600 rounded-xl p-6 text-center cursor-pointer hover:bg-teal-50 transition-colors"
                >
                  {importFile ? (
                    <div>
                      <Package className="mx-auto text-blue-600 mb-2" size={36} />
                      <p className="text-gray-900 font-medium">{importFile.name}</p>
                      <p className="text-gray-500 text-sm">{(importFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto text-teal-600 mb-2" size={36} />
                      <p className="text-teal-600 text-sm">CSV faylni bu yerga torting yoki tanlang</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={importStatus === "processing"}
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className={`inline-block mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm border border-gray-300 ${importStatus === "processing" ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    Fayl tanlash
                  </label>
                </div>

                {/* Status & Errors */}
                {importStatus === "processing" && (
                  <div className="space-y-4 py-4">
                    <div className="text-center">
                      <Loader2 className="mx-auto animate-spin text-teal-600" size={40} />
                      <p className="mt-2 text-sm font-medium">{importMessage}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-teal-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-gray-600">
                      {importProgress}% — {Math.round((importProgress / 100) * (importFile ? 100 : 0))} ta qayta ishlanmoqda
                    </p>
                    <button
                      onClick={cancelImport}
                      className="w-full py-2 bg-red-100 cursor-pointer hover:bg-red-200 text-red-700 rounded-lg text-sm"
                    >
                      Bekor qilish
                    </button>
                  </div>
                )}

                {importStatus === "done" && (
                  <div className="text-center py-4">
                    <Check className="mx-auto text-green-600" size={48} />
                    <h3 className="mt-2 text-xl font-bold text-green-700">Import yakunlandi!</h3>
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-h-60 overflow-auto text-sm">
                    <p className="font-medium text-red-800 mb-2">Xatolar:</p>
                    <ul className="space-y-1 text-red-700">
                      {importErrors.map((err, i) => (
                        <li key={i}>Qator {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleImportCSV}
                    disabled={!importFile || importStatus === "processing"}
                    className={`flex-1 py-2 text-sm rounded-lg font-bold text-white transition-colors shadow-sm
    ${(!importFile || importStatus === "processing")
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-700'}
  `}
                  >
                    Import qilish
                  </button>

                  <button
                    onClick={() => { setShowImport(false); setImportFile(null); }}
                    disabled={importStatus === "processing"}
                    className={`flex-1 py-2 text-sm rounded-lg text-white transition-colors
    ${importStatus === "processing" ? 'bg-gray-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}
  `}
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Products Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="text-blue-600" size={24} />
                <h2 className="text-2xl font-bold text-gray-900">Mahsulotlar ro'yxati</h2>
              </div>
              <div className="text-sm text-gray-600">
                {products.length} / {products.length} ta mahsulot ({products.length} dan)
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto w-full">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold w-12">
                    {/* Custom Checkbox - SVG bilan */}
                    <label className="inline-flex items-center gap-3 cursor-pointer group">
                      <span className="relative flex items-center justify-center">
                        {/* Native checkbox (invisible) */}
                        <input
                          type="checkbox"
                          checked={selectedProducts.size === products.length && products.length > 0}
                          onChange={handleSelectAllVisible}
                          className="absolute w-6 h-6 opacity-0 cursor-pointer z-10"
                        />

                        {/* Custom checkbox icon */}
                        <span className={`
      w-6 h-6 rounded-md border-2 flex items-center justify-center
      transition-all duration-200 ease-in-out
      ${selectedProducts.size === products.length && products.length > 0
                            ? 'bg-teal-500 border-teal-500 group-hover:bg-teal-600 group-hover:border-teal-600'
                            : 'bg-white border-gray-300 group-hover:border-teal-400 group-hover:bg-teal-50'
                          }
      ${selectedProducts.size === products.length && products.length > 0
                            ? 'after:content-["✓"] after:text-white after:text-sm after:font-bold'
                            : ''
                          }
      group-focus-within:ring-2 group-focus-within:ring-teal-300 group-focus-within:ring-offset-2
    `} />
                      </span>
                    </label>
                  </th>
                  <th className="px-3 sm:px-4 py-2 sm:py-4 text-left text-gray-600 font-semibold">
                    <SortHeader field="name" label="Mahsulot nomi" />
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
                ) : products.length === 0 ? (
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
                  products.map((p, index) => (
                    <tr
                      key={`${p._id}-${index}`}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-3 sm:px-4 py-2 sm:py-4">
                        {/* Minimal Custom Checkbox */}
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(p._id)}
                              onChange={() => handleSelectProduct(p._id)}
                              className="peer sr-only"
                            />

                            <div className={`
      w-5 h-5 rounded border transition-all duration-200
      peer-checked:bg-teal-500 peer-checked:border-teal-500
      peer-focus:ring-2 peer-focus:ring-teal-300
      ${selectedProducts.has(p._id)
                                ? 'bg-teal-500 border-teal-500'
                                : 'bg-white border-gray-300 hover:border-teal-400'
                              }
    `}>
                              {selectedProducts.has(p._id) && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-xs">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
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
                                onClick={() => handleSave()}
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
                                  openEditModal(p)
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

            {products.length > 0 && hasMore && (
              <div ref={observerTarget} className="py-10 text-center">
                {loadingMore ? (
                  <div className="flex justify-center items-center gap-3">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                    <span className="text-gray-600">Yuklanmoqda...</span>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Pastga suring – ko‘proq mahsulot bor</p>
                )}
              </div>
            )}

            {products.length > 0 && !hasMore && (
              <div className="py-8 text-center text-gray-500 border-t">
                Barcha {totalProducts} ta mahsulot ko‘rsatildi
              </div>
            )}

            {/* End of List */}
            {products.length > 0 && hasMore && (
              <div ref={observerTarget} className="py-6 text-center">
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Yana yuklanmoqda...</span>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Pastga tushing...</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 text-sm text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              {products.length} / {totalProducts} ta mahsulot
              {search && <span className="ml-2">• "{search}" bo'yicha</span>}
              {hasMore && <span className="ml-2">• Yana mavjud</span>}
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
        {
          selectedProducts.size > 0 && (
            <button
              onClick={() => setShowBarcodeModal(true)}
              className="fixed bottom-8 right-8 px-7 py-4 bg-teal-600 text-white rounded-3xl font-bold flex items-center gap-3 shadow-2xl hover:bg-teal-700 transition-all z-50"
            >
              <Printer size={22} />
              Barcode chop etish ({selectedProducts.size})
            </button>
          )
        }
      </main >

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-xl max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                {modalMode === 'add' ? (
                  <>
                    <div className="p-2.5 bg-teal-100 rounded-xl">
                      <Plus className="text-teal-600" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Yangi mahsulot</h2>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 bg-blue-100 rounded-xl">
                      <Edit2 className="text-blue-600" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Tahrirlash</h2>
                  </>
                )}
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">

              {/* Nomi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mahsulot nomi <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                  placeholder="Masalan: Organik olma"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Barcode (ixtiyoriy)
                </label>
                <div className="flex gap-3">
                  <input
                    value={formData.code || ''}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all font-mono"
                    placeholder="P12345678"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, code: generateBarcode() })}
                    className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium transition-colors border border-blue-200"
                  >
                    Generatsiya
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Narx */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Sotish narxi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">so'm</span>
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={e => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Sotib olish narxi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Olingan narx
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">so'm</span>
                    <input
                      type="number"
                      value={formData.boughtPrice || ''}
                      onChange={e => setFormData({ ...formData, boughtPrice: Number(e.target.value) || 0 })}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Ombor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Omborda soni
                  </label>
                  <input
                    type="number"
                    value={formData.stock || ''}
                    onChange={e => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                    placeholder="0"
                  />
                </div>

                {/* O'lchov */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    O'lchov birligi
                  </label>
                  <select
                    value={formData.measure || 'dona'}
                    onChange={e => setFormData({ ...formData, measure: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all bg-white"
                  >
                    <option value="dona">dona</option>
                    <option value="kg">kg</option>
                    <option value="litr">litr</option>
                    <option value="quti">quti</option>
                    <option value="metr">metr</option>
                    <option value="paket">paket</option>
                    <option value="m2">m²</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Bekor qilish
              </button>

              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {modalMode === 'add' ? <Plus size={18} /> : <Save size={18} />}
                {modalMode === 'add' ? 'Qo‘shish' : 'Saqlash'}
              </button>
            </div>

          </div>
        </div>
      )
      }

      {/* ====================== BARCODE PRINT MODAL ====================== */}
      {
        showBarcodeModal && (
          <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[100] p-4 sm:p-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md sm:max-w-xl max-h-[96vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

              {/* Header – ixchamroq */}
              <div className="px-5 py-4 sm:px-6 sm:py-5 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 rounded-xl">
                    <Printer className="text-teal-600" size={26} />
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
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="font-bold">Kichik</div>
                      <div className="text-xs text-gray-500 mt-0.5">30 × 50 mm</div>
                    </button>

                    <button
                      onClick={() => setPrintSize('large')}
                      className={`p-4 rounded-xl border-2 text-center transition-all text-sm ${printSize === 'large'
                        ? 'border-teal-600 bg-teal-50'
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
                        ? 'border-teal-600 bg-teal-50'
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
                        ? 'border-teal-600 bg-teal-50'
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
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="font-semibold">Kitob (Portrait)</div>
                        <div className="text-xs text-gray-500 mt-0.5">Vertikal</div>
                      </button>

                      <button
                        onClick={() => setOrientation('landscape')}
                        className={`p-4 rounded-xl border-2 text-center transition-all text-sm ${orientation === 'landscape'
                          ? 'border-teal-600 bg-teal-50'
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
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Chop etish
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}