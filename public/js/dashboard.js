const socket = io();

// Elementos do DOM
const elements = {
    atr: document.getElementById('atr'),
    botName: document.getElementById('bot-name'),
    buyPosition: document.getElementById('buyPosition'),
    currentPosition: document.getElementById('current-position'),
    currentPrice: document.getElementById('current-price'),
    ema9: document.getElementById('ema9'),
    ema21: document.getElementById('ema21'),
    fakeBank: document.getElementById('fake-bank'),
    operationsHistory: document.getElementById('operations-history'),
    rsi: document.getElementById('rsi'),
    sellPosition: document.getElementById('sellPosition'),
    soundGain: document.getElementById('sound_gain'),
    soundLoss: document.getElementById('sound_loss'),
    startBot: document.getElementById('startBot'),
    stopBot: document.getElementById('stopBot'),
    stopLoss: document.getElementById('stop-loss'),
    totalBuys: document.getElementById('total-buys'),
    totalSales: document.getElementById('total-sales'),
};

let isRunning = false;

// Event Listeners para os botões
elements.startBot.addEventListener('click', () => {
    const botId = getUrlParameter('bot');
    socket.emit('start-bot', botId);
    elements.startBot.disabled = true;
    elements.stopBot.disabled = false;
    isRunning = true;
});

elements.stopBot.addEventListener('click', () => {
    const botId = getUrlParameter('bot');
    socket.emit('stop-bot', botId);
    elements.startBot.disabled = false;
    elements.stopBot.disabled = true;
    isRunning = false;
});

elements.sellPosition.addEventListener('click', () => {
    const botId = getUrlParameter('bot');
    socket.emit('manual-sell', botId);
    elements.sellPosition.disabled = true;
});

elements.buyPosition.addEventListener('click', () => {
    const botId = getUrlParameter('bot');
    socket.emit('manual-buy', botId);
    elements.buyPosition.disabled = true; // Desativa o botão após a compra
});


// Função para obter parâmetros da URL
function getUrlParameter(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Função para inicializar o monitoramento do bot
async function initializeBotMonitoring() {
    const botId = getUrlParameter('bot');
    if (!botId) {
        console.error('Bot ID não especificado');
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('/api/bots');
        const bots = await response.json();
        const bot = bots.find(b => b.id === botId);

        if (!bot) {
            console.error('Bot não encontrado');
            window.location.href = '/';
            return;
        }

        elements.botName.textContent = bot.name;
        socket.emit('monitor-bot', botId);
    } catch (error) {
        console.error('Erro ao inicializar bot:', error);
        window.location.href = '/';
    }
}

// Atualiza os dados do mercado
socket.on('marketUpdate', (data) => {
    elements.currentPrice.textContent = `$ ${parseFloat(data.lastPrice).toFixed(2)}`;

    const ema9Value = parseFloat(data.lastEMA9);
    const ema21Value = parseFloat(data.lastEMA21);

    elements.ema9.textContent = ema9Value.toFixed(2);
    elements.ema21.textContent = ema21Value.toFixed(2);

    if (ema9Value > ema21Value) {
        elements.ema9.className = 'value-higher';
        elements.ema21.className = 'value-lower';
    } else {
        elements.ema9.className = 'value-lower';
        elements.ema21.className = 'value-higher';
    }

    elements.atr.textContent = parseFloat(data.atr).toFixed(2);

    elements.fakeBank.textContent = "$ " + parseFloat(data.fakeBank).toFixed(5);

    const rsiValue = parseFloat(data.rsi);
    elements.rsi.textContent = rsiValue.toFixed(2);
    elements.rsi.className = rsiValue > 50 ? 'rsi-above' : 'rsi-below';

    elements.totalBuys.textContent = data.qtdBuy;
    elements.totalSales.textContent = data.qtdSale;

    // Atualiza o botão de venda baseado na posição
    elements.sellPosition.disabled = data.position !== 'long';
    elements.buyPosition.disabled = data.position !== null;

    if (data.position === 'long') {
        elements.currentPosition.textContent = 'COMPRADO';
        elements.currentPosition.className = 'position-long';
        elements.stopLoss.textContent = `Stop Loss: $ ${parseFloat(data.stopLoss).toFixed(2)}`;
    } else if (data.position === 'short') {
        elements.currentPosition.textContent = 'VENDIDO';
        elements.currentPosition.className = 'position-short';
        elements.stopLoss.textContent = 'Stop Loss: -';
    } else {
        elements.currentPosition.textContent = 'Nenhuma posição aberta';
        elements.currentPosition.className = '';
        elements.stopLoss.textContent = 'Stop Loss: -';
    }
});

// Adiciona nova operação ao histórico
socket.on('newOperation', (operation) => {
    const row = document.createElement('tr');

    // Add profit/loss information if available
    let profitDisplay = '';
    if (operation.profit !== null) {
        const isProfit = operation.profit > 0;
        profitDisplay = `<td class="${isProfit ? 'text-success' : 'text-danger'}">
        ${isProfit ? '+' : ''}$ ${Math.abs(parseFloat(operation.profit)).toFixed(5)}
        </td>`;

        // Play appropriate sound
        if (isProfit) {
            elements.soundGain.play();
        } else {
            elements.soundLoss.play();
        }
    } else {
        profitDisplay = '<td>-</td>';
    }

    row.innerHTML = `
        <td>${new Date(operation.timestamp).toLocaleString()}</td>
        <td>${operation.action}</td>
        <td>$ ${parseFloat(operation.price).toFixed(3)}</td>
        ${profitDisplay}
    `;

    elements.operationsHistory.insertBefore(row, elements.operationsHistory.firstChild);
});

// Inicializa o monitoramento quando a página carregar
document.addEventListener('DOMContentLoaded', initializeBotMonitoring);