export const API_URL =
  process.env.NEXT_PUBLIC_API_URL

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText || "API Error")
  }

  return res.json()
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

export interface DebtRecord {
  _id: string
  date: string
  customerName: string
  amount: number
  phoneNumber: string
  status: "pending" | "paid"
  dueDate: string
}

export interface TopProduct {
  productId: string;
  name: string;
  code: string;
  price: number;
  measure: string;
  stock: number;
  soldQuantity: number;
  totalRevenue: number;
}

export async function getTopSellingProducts(limit: number = 15): Promise<TopProduct[]> {
  try {
    const response = await fetch(`${API_URL}/reports/top-selling?limit=${limit}`, { next: { revalidate: 60 }, credentials: 'include' });
    if (!response.ok) {
      throw new Error('Top mahsulotlarni olishda xatolik');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Top selling error:', error);
    return [];
  }
}

export const getProducts = () =>
  request<Product[]>("/products", { next: { revalidate: 60 }, credentials: 'include' })

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

export const getInvoices = () =>
  request<Invoice[]>("/invoices", { next: { revalidate: 60 }, credentials: 'include' })

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

export const getDebtRecords = () =>
  request<DebtRecord[]>("/debts", { next: { revalidate: 60 }, credentials: 'include' })

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

export const getReports = (
  startDate: string,
  endDate: string
) =>
  request<{
    totalSales: number
    totalInvoices: number
    invoices: Invoice[]
  }>(`/reports?startDate=${startDate}&endDate=${endDate}`, { next: { revalidate: 60 }, credentials: 'include' })


export const sendSms = (phone: string, message: string) =>
  request<{ success: boolean, error?: string }>(`/debts/send-sms`, { method: 'POST', body: JSON.stringify({ phone, message }), credentials: 'include' })

export const getSmsHistoryForPhone = async (phone: string) =>
  request<[]>(`/debts/get-sms-history`, { method: 'POST', body: JSON.stringify({ phone }), credentials: 'include' })