const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const tradingBot = require('./bot/tradingBot');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Configurar Socket.IO
io.on('connection', (socket) => {
    console.log('Cliente conectado');

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Iniciar o bot com o Socket.IO
tradingBot.start(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});