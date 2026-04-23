const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
  {
    userId: String,
    codigo: String,
    status: { type: String, default: 'pendente' },
    usado: { type: Boolean, default: false },
    tipo: { type: String, default: 'openbar' },
    preco: { type: Number, default: 80 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', TicketSchema);