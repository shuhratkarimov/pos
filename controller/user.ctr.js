const User = require('../schema/user.schema')
const bcrypt = require('bcryptjs')
const Shop = require('../schema/shop.schema')
const jwt = require('jsonwebtoken')
const { JWT_SECRET } = process.env
const UserSettings = require('../schema/settings.schema')

const getMe = async (req, res) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: 'Token topilmadi' });
    }

    const { id } = jwt.verify(token, JWT_SECRET);

    // lean ishlatmaymiz, populate ishlashi uchun
    const user = await User.findById(id)
      .populate('shop');

    if (!user) {
      return res.status(404).json({ message: 'User topilmadi' });
    }

    // passwordni olib tashlaymiz
    const userObj = user.toObject();
    delete userObj.password;

    res.json(userObj);

  } catch (error) {
    res.status(401).json({ message: 'Token yaroqsiz yoki muddati tugagan' });
  }
}

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('shop')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body
    const isUsernameExist = await User.findOne({ username })
    if (isUsernameExist) return res.status(400).json({ message: 'Username already exists' })
    const user = await User.create({ username, password })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const ok = await bcrypt.compare(oldPassword, user.password)
    if (!ok) return res.status(400).json({ message: 'Eski parol xato' })

    user.password = newPassword
    await user.save()

    res.json({ message: 'Parol muvaffaqiyatli yangilandi' })
  } catch (err) {
    res.status(500).json({ message: 'Server xatolik' })
  }
}

const changePasswordByAdmin = async (req, res) => {
  try {
    const { newPassword } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.password = newPassword
    await user.save()

    res.json({ message: 'Parol muvaffaqiyatli yangilandi' })
  } catch (err) {
    res.status(500).json({ message: 'Server xatolik' })
  }
}

const updateUserName = async (req, res) => {
  try {
    const { username } = req.body
    const foundUsername = await User.findById(req.user.id)
    if (!foundUsername) return res.status(400).json({ message: 'Ushbu foydalanuvchi topilmadi' })
    const isUsernameExist = await User.findOne({ username })
    if (isUsernameExist && isUsernameExist._id.toString() !== foundUsername._id.toString()) return res.status(400).json({ message: 'Ushbu foydalanuvchi ismi mavjud' })
    const user = await User.findByIdAndUpdate(foundUsername._id, { username }).select('-password')
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    const shop = await Shop.findByIdAndDelete(user.shop);
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    res.json({ message: "Foydalanuvchi o'chirildi", username: user.username });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.body
    const user = await User.findByIdAndUpdate(req.params.id, { phoneNumber }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateSettings = async (req, res) => {
  try {
    const { autoSmsOnDueDate, autoSmsOverdue } = req.body
    const user = await UserSettings.findOneAndUpdate({ user: req.user.id }, { autoSmsOnDueDate, autoSmsOverdue }, { new: true })
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getSettings = async (req, res) => {
  try {
    let settings = await UserSettings.findOne({ user: req.user.id })
    if (!settings) {
      settings = await UserSettings.create({ user: req.user.id })
    }
    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  changePassword,
  registerUser,
  getAllUsers,
  updateUserName,
  deleteUser,
  getMe,
  changePasswordByAdmin,
  updatePhoneNumber,
  updateSettings,
  getSettings
}
