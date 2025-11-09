# ProfReport Frontend

Платформа профориентационного тестирования.

## Запуск для разработки

```bash
npm install
npm run dev
```

## Docker Production

Файл `docker-compose.yml` не включён в репозиторий. Получите его от администратора проекта.

### Запуск с переменными окружения

```bash
export PUBLIC_API_URL=https://your-domain.com/api/v1
export PUBLIC_SITE_URL=https://your-domain.com

docker-compose up profreport-prod --build
```

Доступно на http://localhost:80
