# ProfReport Frontend

Платформа профориентационного тестирования.

## Запуск для разработки

```bash
npm install
npm run dev
```

## Docker Production

### Способ 1: Через переменные окружения (рекомендуется)

```bash
export PUBLIC_API_URL=https://your-domain.com/api/v1
export PUBLIC_SITE_URL=https://your-domain.com

cp docker-compose.example.yml docker-compose.yml
docker-compose up profreport-prod --build
```

### Способ 2: Через .env файл

```bash
cp .env.example .env
# Отредактируйте .env с вашими настройками

cp docker-compose.example.yml docker-compose.yml
docker-compose up profreport-prod --build
```

Доступно на http://localhost:80
