// providers/devsms.js
const axios = require('axios');

const TOKEN = process.env.SMS_TOKEN;
const BASE_URL = process.env.SMS_BASE_URL || 'https://devsms.uz/api';  // agar boshqa bo'lsa o'zgartirasiz

if (!TOKEN || !BASE_URL) {
  throw new Error('SMS_TOKEN va SMS_BASE_URL .env faylida bo‘lishi shart!');
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// SMS yuborish
async function sendSMS(phone, message) {
  try {
    const response = await api.post('/send_sms.php', {
      phone: phone.replace(/\D/g, ''),   // faqat raqamlar qoldirish (998901234567 shaklida)
      message,
      // agar kerak bo'lsa qo'shimcha parametrlar: sender, callback_url va h.k.
    });

    const data = response.data;

    if (data.success === true || data.status === 'success' || data.message_id) {
      return {
        success: true,
        messageId: data.message_id || data.id || null,
        response: data,
      };
    }

    return {
      success: false,
      error: data.error || data.message || 'Noma\'lum xato',
      response: data,
    };

  } catch (err) {
    const errorData = err.response?.data || {};
    return {
      success: false,
      error: errorData.error || err.message || 'Provayderga ulanib bo‘lmadi',
      status: err.response?.status,
      response: errorData,
    };
  }
}

// Balansni olish (foydali bo'ladi, masalan cron yoki admin panel uchun)
async function getTotalBalanceInProvider() {
  try {
    const { data } = await api.get('/get_balance.php');
    return {
      success: true,
      balance: data.data.balance || data.data.amount || 0,
      response: data,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message,
    };
  }
}

module.exports = { sendSMS, getTotalBalanceInProvider };