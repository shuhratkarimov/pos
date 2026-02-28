const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const User = require("../schema/user.schema");

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ message: 'No access token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);

    req.user = {
      id: payload.id,
      role: user.role,
      shop: user.shop || null,
      tenantId: user.shop || null
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;
