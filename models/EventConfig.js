const mongoose = require('mongoose');

const EventConfigSchema = new mongoose.Schema({
  nomeEvento: {
    type: String,
    default: 'Tropical Vibes 2026'
  },
  dataEvento: {
    type: String,
    default: '04 de Janeiro de 2026'
  },
  horarioEvento: {
    type: String,
    default: '22h até 06h'
  },
  localEvento: {
    type: String,
    default: 'Salvador/BA'
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
  imagemEvento: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EventConfig', EventConfigSchema);