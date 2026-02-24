const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','shopOwner'], default: 'shopOwner' },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  phoneNumber: { type: String, required: true },
});

UserSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const hashed = await bcrypt.hash(this.password, 10);
    this.password = hashed;
  }
});

// Password tekshirish
UserSchema.methods.comparePassword = async function(password){
  return await bcrypt.compare(password, this.password);
}

module.exports = mongoose.model('User', UserSchema);
