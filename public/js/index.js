document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/bots');
        const bots = await response.json();

        const container = document.getElementById('bots-container');
        const template = document.getElementById('bot-card-template');

        const handleImageError = (img) => {
            img.onerror = null; // Previne loop infinito
            img.src = '/images/defaults/bot-default.jpg';
        };

        bots.forEach(bot => {
            const clone = template.content.cloneNode(true);

            // Adiciona tratamento de erro para a imagem
            const imgElement = clone.querySelector('img');
            imgElement.src = bot.thumbnail;
            imgElement.onerror = () => handleImageError(imgElement);

            // Preenche os dados do bot no template
            clone.querySelector('img').src = bot.thumbnail;
            clone.querySelector('.card-title').textContent = bot.name;
            clone.querySelector('.description').textContent = bot.description;

            // Preenche as características
            const featuresList = clone.querySelector('.features');
            bot.features.forEach(feature => {
                const li = document.createElement('li');
                li.textContent = feature;
                featuresList.appendChild(li);
            });

            // Status badge
            const statusBadge = clone.querySelector('.badge');
            statusBadge.textContent = bot.status === 'active' ? 'Ativo' : 'Inativo';
            statusBadge.classList.add(bot.status === 'active' ? 'bg-success' : 'bg-secondary');

            // Link para o dashboard
            const link = clone.querySelector('.btn');
            link.href = `/dashboard.html?bot=${bot.id}`;

            // Data de criação
            clone.querySelector('.created-date').textContent = new Date(bot.created).toLocaleDateString();

            container.appendChild(clone);
        });
    } catch (error) {
        console.error('Erro ao carregar bots:', error);
    }
});