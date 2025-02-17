const bots = [
    {
        id: '1',
        name: 'Turtle',
        description: 'A tartaruga simboliza paciência e segurança, movendo-se devagar, mas sempre chegando ao seu destino.',
        symbol: 'BTCUSDT',
        status: 'Conservador',
        created: '2024-02-15',
        thumbnail: '/images/bots/turtle.png' || '/images/defaults/bot-default.png',
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