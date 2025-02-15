const axios = require('axios');
const fs = require('fs');

class TradingBot {
    constructor() {
        this.SYMBOL = 'BTCUSDT';
        this.PERIOD = 14;
        this.INTERVAL = '1h';
        this.LIMIT = 200;
        this.API_URL = 'https://api.binance.com';
        this.position = null;
        this.portfolio = 100;
        this.stopLoss = null;
        this.qtdBuy = 0;
        this.qtdSale = 0;
        this.io = null;
    }

    start(io) {
        this.io = io;
        setInterval(() => this.executeStrategy(), 10000);
    }

    averages(prices, startIndex) {
        let gains = 0, losses = 0;

        for (let i = 0; i < this.PERIOD && (i + startIndex) < prices.length; i++) {
            const diff = prices[i + startIndex] - prices[i + startIndex - 1];
            if (diff >= 0)
                gains += diff;
            else
                losses += Math.abs(diff);
        }

        let avgGains = gains / this.PERIOD;
        let avgLosses = losses / this.PERIOD;
        return { avgGains, avgLosses };
    }

    calculateEMA(prices, period) {
        let multiplier = 2 / (period + 1);
        let emaArray = [];
        let sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        emaArray.push(sma);

        for (let i = period; i < prices.length; i++) {
            let ema = (prices[i] - emaArray[i - period]) * multiplier + emaArray[i - period];
            emaArray.push(ema);
        }
        return emaArray;
    }

    calculateATR(candles) {
        if (candles.length < this.PERIOD + 1) {
            console.error("Não há dados suficientes para calcular o ATR");
            return null;
        }

        let TRs = [];
        for (let i = 1; i < candles.length; i++) {
            const currentHigh = candles[i].high;
            const currentLow = candles[i].low;
            const previousClose = candles[i - 1].close;

            const tr1 = currentHigh - currentLow;
            const tr2 = Math.abs(currentHigh - previousClose);
            const tr3 = Math.abs(currentLow - previousClose);

            const trueRange = Math.max(tr1, tr2, tr3);
            TRs.push(trueRange);
        }

        let atr = 0;
        for (let i = 0; i < this.PERIOD; i++) {
            atr += TRs[i];
        }
        atr /= this.PERIOD;

        for (let i = this.PERIOD; i < TRs.length; i++) {
            atr = ((atr * (this.PERIOD - 1)) + TRs[i]) / this.PERIOD;
        }

        return atr;
    }

    calculateRSI(prices) {
        let avgGains = 0, avgLosses = 0;

        for (let i = 1; i < prices.length; i++) {
            let newAverages = this.averages(prices, i);

            if (i === 1) {
                avgGains = newAverages.avgGains;
                avgLosses = newAverages.avgLosses;
                continue;
            }

            avgGains = (avgGains * (this.PERIOD - 1) + newAverages.avgGains) / this.PERIOD;
            avgLosses = (avgLosses * (this.PERIOD - 1) + newAverages.avgLosses) / this.PERIOD;
        }

        const rs = avgGains / avgLosses;
        return 100 - (100 / (1 + rs));
    }

    async fetchMarketData() {
        try {
            const { data } = await axios.get(`${this.API_URL}/api/v3/klines`, {
                params: {
                    symbol: this.SYMBOL,
                    interval: this.INTERVAL,
                    limit: this.LIMIT
                }
            });
            return data.map(k => ({
                close: parseFloat(k[4]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3])
            }));
        } catch (error) {
            console.error('Erro ao buscar os dados:', error.message);
            return null;
        }
    }

    logOperation(action, price, rsi) {
        const timestamp = new Date().toISOString();
        const operation = {
            timestamp,
            action,
            price
        };

        // Emite o evento de nova operação via Socket.IO
        if (this.io) {
            this.io.emit('newOperation', operation);
        }

        const log = `${timestamp} - ${action} at ${price} | rsi: ${rsi}\n`;
        fs.appendFile('operations_history.txt', log, (err) => {
            if (err) {
                console.error('Erro ao salvar operação:', err);
            }
        });
    }

    async executeStrategy() {
        const candles = await this.fetchMarketData();
        if (!candles) return;

        const prices = candles.map(candle => candle.close);
        const ema9 = this.calculateEMA(prices, 9);
        const ema21 = this.calculateEMA(prices, 21);
        const atr = this.calculateATR(candles);
        const rsi = this.calculateRSI(prices);
        const lastPrice = prices[prices.length - 1];
        const prevEMA9 = ema9[ema9.length - 2];
        const prevEMA21 = ema21[ema21.length - 2];
        const lastEMA9 = ema9[ema9.length - 1];
        const lastEMA21 = ema21[ema21.length - 1];

        // Emite atualização do mercado via Socket.IO
        if (this.io) {
            this.io.emit('marketUpdate', {
                lastPrice,
                lastEMA9,
                lastEMA21,
                atr,
                rsi,
                position: this.position,
                stopLoss: this.stopLoss,
                qtdBuy: this.qtdBuy,
                qtdSale: this.qtdSale
            });
        }

        const crossedAbove = prevEMA9 <= prevEMA21 && lastEMA9 > lastEMA21;
        const crossedBelow = prevEMA9 >= prevEMA21 && lastEMA9 < lastEMA21;

        console.log(`$: ${lastPrice}`);
        console.log(`Compras: ${this.qtdBuy}\nVendas: ${this.qtdSale}`);
        console.log(`EMA9: ${lastEMA9}\nEMA21: ${lastEMA21}\nATR: ${atr}`);
        console.log(`RSI: ${rsi}`);

        if (crossedAbove && rsi > 50 && (!this.position || this.position === 'short')) {
            this.logOperation('Compra', lastPrice, rsi);
            this.position = 'long';
            this.portfolio -= 1;
            this.qtdBuy += 1;
            this.stopLoss = lastPrice - atr * 1.5;
            console.log(`Sinal de compra detectado. Stop Loss definido em ${this.stopLoss}`);
        }

        if (crossedBelow && rsi < 50 && this.position === 'long') {
            this.logOperation('Venda', lastPrice, rsi);
            this.position = 'short';
            this.portfolio += 2;
            this.qtdSale += 1;
            this.stopLoss = lastPrice + atr * 1.5;
            console.log(`Sinal de venda detectado. Stop Loss definido em ${this.stopLoss}`);
        }

        if (this.position === 'long' && lastPrice <= this.stopLoss) {
            this.logOperation('Stop Loss - Venda', lastPrice, rsi);
            this.position = null;
            console.log('Stop Loss acionado! Saindo da posição de compra.');
        }

        if (this.position === 'short' && lastPrice >= this.stopLoss) {
            this.logOperation('Stop Loss - Compra', lastPrice, rsi);
            this.position = null;
            console.log('Stop Loss acionado! Saindo da posição de venda.');
        }
    }
}

module.exports = new TradingBot();