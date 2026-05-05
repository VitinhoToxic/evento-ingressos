const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    nomeEvento: {
      type: String,
      required: true,
      default: 'Tropical Vibes 2027'
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    dataEvento: {
      type: String,
      default: '31 de Dezembro de 2026'
    },

    horarioEvento: {
      type: String,
      default: '22h até 06h'
    },

    localEvento: {
      type: String,
      default: 'Brasília/DF'
    },

    descricaoEvento: {
      type: String,
      default: 'Uma experiência completa com ingressos digitais, QR Code individual e validação rápida na entrada.'
    },

    imagemEvento: {
      type: String,
      default: ''
    },

    precoOpenBar: {
      type: Number,
      default: 80
    },

    precoPista: {
      type: Number,
      default: 40
    },

    limiteIngressos: {
      type: Number,
      default: 400
    },

    ativo: {
      type: Boolean,
      default: true
    },

    criadoPor: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Event', EventSchema);