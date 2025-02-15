const socket = io();

// Elementos do DOM
const elements = {
    currentPrice: document.getElementById('current-price'),
    ema9: document.getElementById('ema9'),
    ema21: document.getElementById('ema21'),
    atr: document.getElementById('atr'),
    rsi: document.getElementById('rsi'),
    totalBuys: document.getElementById('total-buys'),
    totalSales: document.getElementById('total-sales'),
    currentPosition: document.getElementById('current-position'),
    stopLoss: document.getElementById('stop-loss'),
    operationsHistory: document.getElementById('operations-history')
};

// Atualiza os dados do mercado
socket.on('marketUpdate', (data) => {
    elements.currentPrice.textContent = `$ ${parseFloat(data.lastPrice).toFixed(2)}`;

    // Atualiza EMA9 e EMA21 com comparação de cores
    const ema9Value = parseFloat(data.lastEMA9);
    const ema21Value = parseFloat(data.lastEMA21);

    elements.ema9.textContent = ema9Value.toFixed(2);
    elements.ema21.textContent = ema21Value.toFixed(2);

    // Aplica cores baseado na comparação
    if (ema9Value > ema21Value) {
        elements.ema9.className = 'value-higher';
        elements.ema21.className = 'value-lower';
    } else {
        elements.ema9.className = 'value-lower';
        elements.ema21.className = 'value-higher';
    }

    // Atualiza ATR
    elements.atr.textContent = parseFloat(data.atr).toFixed(2);

    // Atualiza RSI com cor baseada no valor
    const rsiValue = parseFloat(data.rsi);
    elements.rsi.textContent = rsiValue.toFixed(2);
    elements.rsi.className = rsiValue > 50 ? 'rsi-above' : 'rsi-below';
    elements.currentPrice.textContent = `$ ${parseFloat(data.lastPrice).toFixed(2)}`;
    elements.ema9.textContent = parseFloat(data.lastEMA9).toFixed(2);
    elements.ema21.textContent = parseFloat(data.lastEMA21).toFixed(2);
    elements.atr.textContent = parseFloat(data.atr).toFixed(2);
    elements.rsi.textContent = parseFloat(data.rsi).toFixed(2);
    elements.totalBuys.textContent = data.qtdBuy;
    elements.totalSales.textContent = data.qtdSale;

    // Atualiza a posição atual
    if (data.position === 'long') {
        elements.currentPosition.textContent = 'COMPRADO';
        elements.currentPosition.className = 'position-long';
    } else if (data.position === 'short') {
        elements.currentPosition.textContent = 'VENDIDO';
        elements.currentPosition.className = 'position-short';
    } else {
        elements.currentPosition.textContent = 'Nenhuma posição aberta';
        elements.currentPosition.className = '';
    }

    // Atualiza o stop loss
    if (data.stopLoss) {
        elements.stopLoss.textContent = `Stop Loss: $ ${parseFloat(data.stopLoss).toFixed(2)}`;
    } else {
        elements.stopLoss.textContent = 'Stop Loss: -';
    }
});

// Adiciona nova operação ao histórico
socket.on('newOperation', (operation) => {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${new Date(operation.timestamp).toLocaleString()}</td>
        <td>${operation.action}</td>
        <td>$ ${parseFloat(operation.price).toFixed(2)}</td>
    `;

    elements.operationsHistory.insertBefore(row, elements.operationsHistory.firstChild);
});