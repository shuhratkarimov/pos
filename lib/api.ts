export const API_URL =
  process.env.NEXT_PUBLIC_API_URL

async function request<T>(path: string, options?: RequestInit, nextOptions?: { revalidate?: number }): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(options?.body && { "Content-Type": "application/json" }),
    },
    ...options,
  });

  // Body-ni faqat bir marta o‘qiymiz
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // Agar JSON bo'lmasa bo'sh object qoldiramiz
  }

  if (!res.ok) {
    const errorMessage =
      data?.message || (data?.errors ? data.errors.join(", ") : "API Error");

    throw new Error(`${res.status} - ${errorMessage}`);
  }

  return data; // shu yerda oldin o‘qilgan data-ni qaytaramiz
}

export interface Product {
  _id: string
  name: string
  price: number
  code: string | undefined
  boughtPrice?: number
  stock: number
  measure: string
}

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  boughtPrice?: number
  measure: string
  subtotal: number
}

export interface Invoice {
  _id: string
  date: string
  items: CartItem[]
  subtotal: number
  total: number
  profit?: number
  paymentMethod: string
}

interface InvoiceResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface DebtRecord {
  _id: string
  date: string
  customerName: string
  amount: number
  phoneNumber: string
  status: "pending" | "paid"
  dueDate: string
}

export interface DebtResponse {
  data: DebtRecord[];
  pagination: {
    hasMore: boolean,
    limit: number,
    nextPage: number | null,
    page: number,
    prevPage: number | null,
    totalPages: number,
    total: number
  }
  success: boolean
}

export interface TopProduct {
  data: [{
    productId: string;
    name: string;
    code: string;
    price: number;
    measure: string;
    stock: number;
    soldQuantity: number;
    totalRevenue: number;
  }],
  period: {
    startDate: string;
    endDate: string;
  },
  success: boolean,
  totalSales: number,
}

export const getProducts = async function (params: {
  page?: number
  limit?: number
  search?: string
  stockFilter?: string
  sortField?: string
  sortDirection?: 'asc' | 'desc'
} = {}) {
  const query = new URLSearchParams()

  if (params.page) query.set('page', params.page.toString())
  if (params.limit) query.set('limit', params.limit.toString())
  if (params.search) query.set('search', params.search)
  if (params.stockFilter) query.set('stockFilter', params.stockFilter)
  if (params.sortField) query.set('sortField', params.sortField)
  if (params.sortDirection) query.set('sortDirection', params.sortDirection)

  // request helper bilan ishlash
  return request<{
    products: Product[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }>(`/products?${query.toString()}`, { credentials: 'include', next: { revalidate: 60 } })
}

export const getProductStatsAPI = () =>
  request<{
    totalProducts: number
    totalStock: number
    potentialProfit: number
    lowStockCount: number
    outOfStockCount: number
    totalValue: number
  }>("/products/stats", { credentials: 'include' });

// Top sotilgan mahsulotlarni davr bo'yicha olish
export async function getTopSellingProducts(limit: number = 15, startDate?: string, endDate?: string) {
  try {
    let url = `${API_URL}/reports/top-selling`
    const params = new URLSearchParams()

    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    if (params.toString()) {
      url += `?${params.toString()}`
    }

    const res = await fetch(url, {
      credentials: 'include',
      next: { revalidate: 60 }
    })

    if (!res.ok) throw new Error('Top products yuklanmadi')
    return await res.json()
  } catch (error) {
    console.error('getTopSellingProducts error:', error)
    return []
  }
}

export const addProduct = (
  product: Omit<Product, "_id">
) =>
  request<Product>("/products", {
    method: "POST",
    body: JSON.stringify(product),
    credentials: 'include'
  })

export const updateProduct = (
  id: string,
  updates: Partial<Product>
) =>
  request<Product>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
    credentials: 'include'
  })

export const deleteProduct = (id: string) =>
  request<void>(`/products/${id}`, {
    method: "DELETE",
    credentials: 'include'
  })
export const getInvoices = (params: {
  page?: number;
  limit?: number;
  search?: string;
  dateFilter?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) => {
  const query = new URLSearchParams();

  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  if (params.dateFilter) query.set('dateFilter', params.dateFilter);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  return request<InvoiceResponse>(`/invoices?${query.toString()}`, {
    credentials: 'include',
    next: { revalidate: 60 }
  });
};

export const addInvoice = (
  invoice: Omit<Invoice, "_id">,
) =>
  request<Invoice>("/invoices", {
    method: "POST",
    body: JSON.stringify(invoice),
    credentials: 'include'
  })

export const deleteInvoice = (id: string) =>
  request<void>(`/invoices/${id}`, {
    method: "DELETE",
    credentials: 'include'
  })

export const getDebtRecords = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'paid';
}) => {
  const query = new URLSearchParams();

  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);

  // to'g'ri interfeys bilan qaytarish
  return request<DebtResponse>(
    `/debts?${query.toString()}`,
    {
      credentials: 'include',
      next: { revalidate: 0 }   // real-time bo'lishi uchun cache qilmaymiz
    }
  );
};

export const addDebtRecord = (
  record: Omit<DebtRecord, "_id">
) =>
  request<DebtRecord>("/debts", {
    method: "POST",
    body: JSON.stringify(record),
    credentials: 'include'
  })

export const updateDebtRecord = (
  id: string,
  updates: Partial<DebtRecord>
) =>
  request<DebtRecord>(`/debts/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
    credentials: 'include'
  })

export const deleteDebtRecord = (id: string) =>
  request<void>(`/debts/${id}`, {
    method: "DELETE",
    credentials: 'include'
  })

export const getReportSummary = (
  startDate: string,
  endDate: string,
  period: 'daily' | 'weekly' | 'monthly' | 'hourly' = 'daily'
) =>
  request<{
    totalSales: number;
    totalInvoices: number;
    totalProfit: number;
    totalItems: number;
    averageTicket: number;
    minTicket: number;
    maxTicket: number;
    timeSeries: Array<{ _id: string; sales: number; count: number; itemsSold: number }>;
    topProducts: Array<{ name: string; sales: number; quantity: number }>;
    lastUpdate?: string;
  }>(
    `/reports/summary?startDate=${startDate}&endDate=${endDate}&period=${period}`,
    { credentials: 'include', next: { revalidate: 300 } }
  );

export const getReportInvoices = (
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 20
) =>
  request<{
    invoices: Invoice[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(
    `/reports/invoices?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=${limit}`,
    { credentials: 'include', next: { revalidate: 60 } }
  );

export const sendSms = (phone: string, message: string) =>
  request<{ success: boolean, error?: string }>(`/debts/send-sms`, { method: 'POST', body: JSON.stringify({ phone, message }), credentials: 'include' })

export const getSmsHistoryForPhone = async (phone: string) =>
  request<[]>(`/debts/get-sms-history`, { method: 'POST', body: JSON.stringify({ phone }), credentials: 'include' })

export const getPotentialProfit = () =>
  request<{ potentialProfit: number, totalProducts: number }>(`/products/potential-profit`, { credentials: 'include', next: { revalidate: 60 } })

export const getInvoiceStats = () =>
  request<{ totalInvoices: number, totalValue: number, totalItems: number, average: number }>(`/invoices/stats`, { credentials: 'include', next: { revalidate: 60 } })
