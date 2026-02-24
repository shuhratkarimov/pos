# POS Sistema (Point of Sale)

Zamonaviy do'konlar uchun zamonaviy savdo nuqtasi (POS) tizimi. Next.js, React va TypeScript bilan qurilgan.

## Xususiyatlari

### 1. **Asosiy Savat Sahifasi** 
- Mahsulotlarning ixcham ro'yxati
- Kod yoki nomi bo'yicha qidirish
- Savat sistemi (qo'shish, o'chirish, miqdor o'zgartirish)
- O'lchov birligiga ko'ra hisoblash
- Jami summa va soliq hisoblash
- Chek chiqarish imkoni

### 2. **Mahsulotlarni Boshqarish Sahifasi**
- Yangi mahsulot qo'shish
- Mahsulot tafsilotlarini tahrirlash
- O'mbor miqdorini o'zgartirish
- Mahsulot ro'yxati (nom, kod, narxi, o'mbor, o'lchov)

### 3. **Hisobotlar Sahifasi**
- Sana bo'yicha filtrlash
- Davr turi tanlash:
  - Kunlik
  - Haftalik
  - Oylik
  - Yillik
- Jami savdo summasi ko'rsatish
- Jami cheklar soni
- Chek tafsilotlari jadvali

### 4. **Cheklar Sahifasi**
- Barcha cheklar ro'yxati
- Chek tafsilotlarini ko'rish
- Chekni yuklab olish (TXT format)
- Chek ID, sana, jami summa ko'rsatish

### 5. **Qarz Daftari Sahifasi**
- Qolgan qarz va to'langan qarzni ko'rsatish
- Yangi qarz qayd qilish
- Buyurtmachi nomi, qarz summasi, tugatish sanasi
- Qarz holati (to'langan/to'lanmagan)

## Texnologiyalar

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Data Persistence**: localStorage
- **State Management**: React Hooks

## O'rnatish

```bash
# Dependencies o'rnatish
npm install

# Development serverini ishga tushirish
npm run dev

# Build qilish
npm run build

# Production buildni ishga tushirish
npm run start
```

## Fayllar Struktura

```
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Asosiy savat sahifasi
│   ├── products/            # Mahsulotlar sahifasi
│   ├── reports/             # Hisobotlar sahifasi
│   ├── invoices/            # Cheklar sahifasi
│   ├── debt/                # Qarz daftari sahifasi
│   └── globals.css          # Global stillar
├── components/
│   ├── Navigation.tsx       # Navigatsiya menyusi
│   ├── ProductList.tsx      # Mahsulotlar listi
│   └── Cart.tsx             # Savat komponenti
└── lib/
    └── api.ts               # API funktsiyalari va mock ma'lumotlar
```

## Foydalanish

### Mahsulot Qo'shish
1. "Mahsulotlar" sahifasiga o'ting
2. "Mahsulot Qo'sh" tugmasini bosing
3. Mahsulot tafsilotlarini to'ldiring
4. "Saqlash" tugmasini bosing

### Chek Chiqarish
1. Asosiy sahifada mahsulotlarni tanlang
2. "Savatchaga qo'sh" tugmasini bosing
3. Miqdorlarni o'zgartiring (kerak bo'lsa)
4. "Chek Chiqarish" tugmasini bosing
5. Chek avtomatik saqlanadi va o'mbor miqdori kamayadi

### Hisobot Olish
1. "Hisobotlar" sahifasiga o'ting
2. Davr turini tanlang (kunlik/haftalik/oylik/yillik)
3. Boshlanish va tugatish sanasini tanlang
4. "Hisobot Olish" tugmasini bosing

### Qarz Qayd Qilish
1. "Qarz Daftari" sahifasiga o'ting
2. "Qarz Qo'sh" tugmasini bosing
3. Buyurtmachi nomi, qarz summasi va tugatish sanasini kiriting
4. "Saqlash" tugmasini bosing

## Ma'lumotlar Saqlash

Tizim localStorage-da barcha ma'lumotlarni saqlab turamiz:
- `products`: Mahsulotlar ro'yxati
- `invoices`: Cheklar ro'yxati
- `debtRecords`: Qarz daftari

## API Integratsiyasi

`lib/api.ts` faylida barcha API funktsiyalari mavjud:
- `getProducts()`: Mahsulotlarni olish
- `saveInvoice()`: Chekni saqlash
- `getInvoices()`: Cheklar ro'yxatini olish
- `getDebtRecords()`: Qarz daftarini olish
- `addDebtRecord()`: Yangi qarz qo'shish
- `getReports()`: Hisobotlarni olish

## Litsenziya

MIT
