
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSettingsSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  autoSmsOnDueDate: { type: Boolean, default: false },
  autoSmsOverdue: { type: Boolean, default: false },
  autoSendSmsWhenCreated: { type: Boolean, default: false },
})

const UserSettings = mongoose.model('UserSettings', UserSettingsSchema)

module.exports = UserSettings
