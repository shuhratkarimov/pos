
const User = require("../schema/user.schema")
const Shop = require("../schema/shop.schema")
const jwt = require("jsonwebtoken")
const { generateTokens } = require("../utils/tokenGenerator");

async function login(req, res) {
  const { username, password } = req.body;
  const user = await User.findOne({ username })
  if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(401).json({ message: 'Parol xato' });

  const tokens = generateTokens(user);

  res.cookie('accessToken', tokens.accessToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
  res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie('role', user.role, { maxAge: 24 * 60 * 60 * 1000 });
  res.json({ user: { id: user._id, username: user.username, role: user.role, shop: user.shop } });
}

async function refreshToken(req, res) {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'Token topilmadi' });

  try {
    const payload = jwt.verify(token, JWT_REFRESH);
    const user = await User.findById(payload.id)
    if (!user) throw new Error('Foydalanuvchi topilmadi');
    const tokens = generateTokens(user);
    res.cookie('accessToken', tokens.accessToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.cookie('role', user.role, { maxAge: 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user._id, username: user.username, role: user.role, shop: user.shop } });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

async function checkAuth(req, res) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
    }

    res.json({
      user: {
        id: user._id,
        role: user.role,
        shop: user.shop,
        username: user.username,
      },
    });
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

const SECRET_KEY = process.env.INIT_ADMIN_KEY || "my-super-secret";

async function checkInitKey(req, res) {
  const { key } = req.body;
  if (key === SECRET_KEY) {
    return res.status(200).json({ message: "Access granted" });
  } else {
    return res.status(401).json({ message: "Invalid key" });
  }
}

async function initAdmin(req, res) {
  const { username, password, phoneNumber } = req.body;
  const user = await User.findOne({ role: 'admin' });
  if (user) return res.status(400).json({ message: 'Admin mavjud' });
  const admin = await User.create({ username, password, role: 'admin', phoneNumber });
  res.json({ admin });
}

async function logout(req, res) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Chiqish muvaffaqiyatli' });
}

module.exports = {
  login,
  refreshToken,
  checkAuth,
  checkInitKey,
  initAdmin,
  logout
}
