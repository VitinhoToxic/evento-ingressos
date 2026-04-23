const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    nome: String,
    email: { type: String, unique: true },
    senha: String,
    isAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);