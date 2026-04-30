require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const User = require('./models/User');
const Ticket = require('./models/Ticket');
const EventConfig = require('./models/EventConfig');

const app = express();
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Mongo conectado'))
  .catch(err => console.error('Erro Mongo:', err));

const LIMITE = 400;
async function getEventConfig() {
  let config = await EventConfig.findOne();

  if (!config) {
    config = await EventConfig.create({});
  }

  return config;
}

// AUTH
app.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    const existente = await User.findOne({ email });
    if (existente) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hash = await bcrypt.hash(senha, 10);

    // Troque o email abaixo pelo seu se quiser virar admin automaticamente
  const isAdmin = email === 'admin@evento.com' || email === 'vitor1234@gmail.com';

    const user = await User.create({
      nome,
      email,
      senha: hash,
      isAdmin
    });

    res.json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Erro no /register:', error);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin, email: user.email },
      process.env.JWT_SECRET
    );

    res.json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Erro no /login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

function auth(req, res, next) {
  try {
    let token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: 'Token não enviado' });
    }

    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro auth:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

// COMPRA - MODO TESTE
app.post('/comprar', auth, async (req, res) => {
  try {
    const { tipo } = req.body;

    const tiposValidos = ['openbar', 'pista'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de ingresso inválido' });
    }

    const config = await getEventConfig();

    const preco = tipo === 'pista' ? config.precoPista : config.precoOpenBar;
    const nomeTipo = tipo === 'pista' ? 'Pista Tropical' : 'Open Bar Tropical';

    const count = await Ticket.countDocuments({ status: 'pago' });
    if (count >= config.limiteIngressos) {
      return res.status(400).json({ error: 'Ingressos esgotados' });
    }

    const codigo = uuidv4();

    await Ticket.create({
      userId: req.user.id,
      codigo,
      status: 'pago',
      usado: false,
      tipo,
      preco
    });

    const qr = await QRCode.toDataURL(codigo);

    res.json({
      message: 'Ingresso gerado com sucesso',
      codigo,
      qr,
      tipo: nomeTipo,
      preco
    });
  } catch (error) {
    console.error('Erro no /comprar:', error);
    res.status(500).json({ error: 'Erro ao gerar ingresso' });
  }
});

// MEUS INGRESSOS
app.get('/meus-ingressos', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Erro no /meus-ingressos:', error);
    res.status(500).json({ error: 'Erro ao buscar ingressos' });
  }
});

// VALIDAR INGRESSO
app.post('/validar', auth, adminOnly, async (req, res) => {
  try {
    const { codigo } = req.body;

    const ticket = await Ticket.findOne({ codigo });

    if (!ticket) {
      return res.status(404).json({
        ok: false,
        message: 'Ingresso inválido'
      });
    }

    if (ticket.usado) {
      return res.status(400).json({
        ok: false,
        message: 'Ingresso já usado',
        ticket: {
          codigo: ticket.codigo,
          tipo: ticket.tipo,
          preco: ticket.preco,
          validadoPor: ticket.validadoPor || 'Não informado',
          validadoEm: ticket.validadoEm || null
        }
      });
    }

    ticket.usado = true;
    ticket.validadoPor = req.user.email || 'admin';
    ticket.validadoEm = new Date();

    await ticket.save();

    return res.json({
      ok: true,
      message: 'Entrada liberada',
      ticket: {
        codigo: ticket.codigo,
        tipo: ticket.tipo,
        preco: ticket.preco,
        validadoPor: ticket.validadoPor,
        validadoEm: ticket.validadoEm
      }
    });
  } catch (error) {
    console.error('Erro no /validar:', error);
    res.status(500).json({
      ok: false,
      message: 'Erro ao validar ingresso'
    });
  }
});

// ADMIN - RESUMO
app.get('/admin/resumo', auth, adminOnly, async (req, res) => {
  try {
    const totalVendidos = await Ticket.countDocuments({ status: 'pago' });
    const totalUsados = await Ticket.countDocuments({ usado: true });
    const totalDisponiveis = Math.max(LIMITE - totalVendidos, 0);
    const totalUsuarios = await User.countDocuments();

    res.json({
      limite: LIMITE,
      totalVendidos,
      totalUsados,
      totalDisponiveis,
      totalUsuarios
    });
  } catch (error) {
    console.error('Erro no /admin/resumo:', error);
    res.status(500).json({ error: 'Erro ao carregar resumo' });
  }
});

// ADMIN - LISTA DE INGRESSOS
app.get('/admin/ingressos', auth, adminOnly, async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Erro no /admin/ingressos:', error);
    res.status(500).json({ error: 'Erro ao carregar ingressos' });
  }
});

// ADMIN - USUÁRIOS
// ADMIN - USUÁRIOS
app.get('/admin/usuarios', auth, adminOnly, async (req, res) => {
  try {
    const usuarios = await User.find({}, { senha: 0 }).sort({ createdAt: -1 });
    res.json(usuarios);
  } catch (error) {
    console.error('Erro no /admin/usuarios:', error);
    res.status(500).json({ error: 'Erro ao carregar usuários' });
  }
});

// CONFIGURAÇÃO PÚBLICA DO EVENTO
app.get('/evento-config', async (req, res) => {
  try {
    const config = await getEventConfig();
    res.json(config);
  } catch (error) {
    console.error('Erro no /evento-config:', error);
    res.status(500).json({ error: 'Erro ao carregar configuração do evento' });
  }
});

// ADMIN - ATUALIZAR CONFIGURAÇÃO DO EVENTO
app.put('/admin/evento-config', auth, adminOnly, async (req, res) => {
  try {
    const {
      nomeEvento,
      dataEvento,
      horarioEvento,
      localEvento,
      precoOpenBar,
      precoPista,
      limiteIngressos,
      imagemEvento
    } = req.body;

    let config = await getEventConfig();

    config.nomeEvento = nomeEvento || config.nomeEvento;
    config.dataEvento = dataEvento || config.dataEvento;
    config.horarioEvento = horarioEvento || config.horarioEvento;
    config.localEvento = localEvento || config.localEvento;
    config.precoOpenBar = Number(precoOpenBar) || config.precoOpenBar;
    config.precoPista = Number(precoPista) || config.precoPista;
    config.limiteIngressos = Number(limiteIngressos) || config.limiteIngressos;
    config.imagemEvento = imagemEvento || config.imagemEvento;

    await config.save();

    res.json({
      message: 'Configuração do evento atualizada com sucesso',
      config
    });
  } catch (error) {
    console.error('Erro no /admin/evento-config:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração do evento' });
  }
});
// ADMIN - RESETAR TODOS OS INGRESSOS COM SENHA E CONFIRMAÇÃO
app.delete('/admin/reset-ingressos', auth, adminOnly, async (req, res) => {
  try {
    const { senha, confirmar } = req.body;

    if (confirmar !== 'RESETAR_INGRESSOS') {
      return res.status(400).json({
        error: 'Confirmação inválida. Digite RESETAR_INGRESSOS para confirmar.'
      });
    }

    if (!senha) {
      return res.status(400).json({
        error: 'Senha do admin é obrigatória.'
      });
    }

    const admin = await User.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        error: 'Admin não encontrado.'
      });
    }

    const senhaOk = await bcrypt.compare(senha, admin.senha);

    if (!senhaOk) {
      return res.status(401).json({
        error: 'Senha incorreta.'
      });
    }

    const resultado = await Ticket.deleteMany({});

    res.json({
      message: 'Todos os ingressos foram apagados com sucesso.',
      apagados: resultado.deletedCount
    });
  } catch (error) {
    console.error('Erro ao resetar ingressos:', error);
    res.status(500).json({
      error: 'Erro ao resetar ingressos.'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));