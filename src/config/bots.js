const bots = [
    {
        id: 'btc-bot',
        name: 'BTC Trading Bot',
        description: 'Bot de trading automatizado para Bitcoin usando estratégia EMA Cross com RSI',
        symbol: 'BTCUSDT',
        status: 'active',
        created: '2024-02-15',
        thumbnail: '/images/bots/btc-bot.png' || '/images/defaults/bot-default.png',
        features: [
            'Análise técnica com EMA9 e EMA21',
            'Confirmação com RSI',
            'Stop Loss dinâmico baseado em ATR',
            'Monitoramento em tempo real'
        ]
    }
    // Outros bots podem ser adicionados aqui no futuro
];

module.exports = bots;