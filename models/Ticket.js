const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true
    },

    codigo: {
      type: String,
      required: true,
      unique: true
    },

    status: {
      type: String,
      default: 'pago'
    },

    usado: {
      type: Boolean,
      default: false
    },

    tipo: {
      type: String,
      enum: ['openbar', 'pista'],
      default: 'openbar'
    },

    preco: {
      type: Number,
      default: 0
    },

    // Segurança/controle da validação
    validadoPor: {
      type: String,
      default: ''
    },

    validadoEm: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Ticket', TicketSchema);