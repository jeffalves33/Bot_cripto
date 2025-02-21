const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

class TradingBot {
    constructor() {
        this.SYMBOL = 'BTCUSDT';
        this.PERIOD = 14;
        this.INTERVAL = '1s'; //15m
        this.LIMIT = 100;
        this.API_URL = process.env.API_URL_BINANCE_TEST; //'https://data.binance.com';
        this.position = null;
        this.stopLoss = null;
        this.qtdBuy = 0;
        this.qtdSale = 0;
        this.io = null;
        this.isRunning = false;
        this.intervalId = null;
        this.fakeBank = 100;
        this.moneyInput = 10;
        this.entryPrice = null;
    }

    start(io) {
        this.io = io;
        this.isRunning = true;
        this.intervalId = setInterval(() => this.executeStrategy(), 2000);
        console.log('Bot iniciado');
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.position === 'long') this.manualSell();
        console.log('Bot parado');
    }

    async manualSell() {
        if (this.position === 'long') {
            const candles = await this.fetchMarketData();
            if (!candles) return;

            const lastPrice = candles[candles.length - 1].close;

            // Mesmo cálculo de totalReceived
            const btcAmount = this.moneyInput / this.entryPrice;
            const totalReceived = btcAmount * lastPrice;
            this.fakeBank += totalReceived;

            this.logOperation('Venda Manual', lastPrice);
            this.position = null;
            this.qtdSale += 1;
        }
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

    logOperation(action, price) {
        const timestamp = new Date().toISOString();
        let profit = null;

        if (action.includes('Venda') && this.entryPrice) {
            // se "price" é o valor de venda
            const btcAmount = this.moneyInput / this.entryPrice;
            const totalReceived = btcAmount * price; // quanto recebi na venda
            profit = totalReceived - this.moneyInput; // subtraindo o que investi
        }
        const operation = {
            timestamp,
            action,
            price,
            profit
        };

        // Emite o evento de nova operação via Socket.IO
        if (this.io) {
            this.io.emit('newOperation', operation);
        }

        const log = `${timestamp} - ${action} at ${price}\n`;
        fs.appendFile('operations_history.txt', log, (err) => {
            if (err) {
                console.error('Erro ao salvar operação:', err);
            }
        });
    }

    async executeStrategy() {
        if (!this.isRunning) return;

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
        const crossedAbove = prevEMA9 <= prevEMA21 && lastEMA9 > lastEMA21;
        const crossedBelow = prevEMA9 >= prevEMA21 && lastEMA9 < lastEMA21;

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
                qtdSale: this.qtdSale,
                fakeBank: this.fakeBank
            });
        }

        // compra
        if (crossedAbove && rsi > 45 && (!this.position)) {
            this.logOperation('Compra', lastPrice);
            this.position = 'long';
            this.qtdBuy += 1;
            this.entryPrice = lastPrice;
            this.stopLoss = lastPrice - atr * 5;
            this.fakeBank -= this.moneyInput;
        }

        // venda quando curvas se cruzam novamente OU se rsi > 60
        //if (this.position === 'long' && ((crossedBelow && rsi < 50) || rsi > 95)) {
        if (this.position === 'long' && rsi > 75) {
            // 1) Calcula a quantidade de BTC comprada
            const btcAmount = this.moneyInput / this.entryPrice;

            // 2) Calcula o total em USDT recebido na venda
            const totalReceived = btcAmount * lastPrice;

            // 3) Soma ao saldo
            this.fakeBank += totalReceived;

            // 4) Loga a operação
            this.logOperation('Venda', lastPrice);

            // 5) Reseta a posição
            this.position = null;
            this.entryPrice = null;
            this.qtdSale += 1;
        }


        // stop loss
        if (this.position === 'long' && lastPrice <= this.stopLoss) {
            const btcAmount = this.moneyInput / this.entryPrice;
            const totalReceived = btcAmount * lastPrice;

            this.fakeBank += totalReceived;

            this.logOperation('Venda (stop loss)', lastPrice);
            this.position = null;
            this.entryPrice = null;
            this.qtdSale += 1;
        }

    }
}

module.exports = new TradingBot();