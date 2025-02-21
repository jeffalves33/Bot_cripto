const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bots = require('./config/bots');
const btcBot = require('./bots/btcBot');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// API endpoints
app.get('/api/bots', (req, res) => {
    res.json(bots);
});

// Rota para redirecionar para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rota para o dashboard de um bot específico
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Configurar Socket.IO
io.on('connection', (socket) => {
    console.log('Cliente conectado');
    socket.on('start-bot', (botId) => {
        btcBot.start(io);
    });

    socket.on('stop-bot', (botId) => {
        btcBot.stop();
    });

    socket.on('manual-sell', (botId) => {
        btcBot.manualSell();
    });

    socket.on('manual-buy', (botId) => {
        btcBot.manualBuy();
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});