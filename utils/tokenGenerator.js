const jwt = require("jsonwebtoken");
const { JWT_REFRESH, JWT_SECRET } = process.env;

function generateTokens(user) {
    const accessToken = jwt.sign({id: user._id, role: user.role}, JWT_SECRET, {expiresIn: '1d'});
    const refreshToken = jwt.sign({id: user._id}, JWT_REFRESH, {expiresIn: '7d'});
    return {accessToken, refreshToken};
}

module.exports = {generateTokens};
