# Docker Setup для ProfReport

Этот проект поддерживает Docker для удобной разработки и деплоя.

## Быстрый старт

### Разработка (Development)

Запустить dev-сервер с hot-reload:

```bash
docker-compose up profreport-dev
```

Приложение будет доступно на http://localhost:4321

### Продакшн (Production)

Собрать и запустить production-версию:

```bash
docker-compose up profreport-prod
```

## Команды Docker Compose

### Запуск

```bash
# Development режим
docker-compose up profreport-dev

# Production режим
docker-compose up profreport-prod

# В фоновом режиме (detached)
docker-compose up -d profreport-prod
```

### Остановка

```bash
# Остановить контейнеры
docker-compose down

# Остановить и удалить volumes
docker-compose down -v
```

### Пересборка

```bash
# Пересобрать образы
docker-compose build

# Пересобрать без кэша
docker-compose build --no-cache

# Пересобрать и запустить
docker-compose up --build profreport-dev
```

### Логи

```bash
# Посмотреть логи
docker-compose logs

# Следить за логами в реальном времени
docker-compose logs -f profreport-dev
```

## Прямое использование Docker

### Development

```bash
# Собрать dev образ
docker build -f Dockerfile.dev -t profreport-front-dev .

# Запустить dev контейнер с volume для hot-reload
docker run -p 4321:4321 -v $(pwd):/app -v /app/node_modules profreport-front-dev
```

### Production

```bash
# Собрать production образ
docker build -t profreport-front-prod .

# Запустить production контейнер
docker run -p 4321:4321 profreport-front-prod
```

## Переменные окружения

Создайте `.env` файл в корне проекта для переменных окружения:

```env
NODE_ENV=production
API_URL=https://proffreport.ru/api/v1
```

Затем подключите его в docker-compose:

```yaml
environment:
  - NODE_ENV=${NODE_ENV}
  - API_URL=${API_URL}
```

## Структура файлов

- `Dockerfile` - Production образ (multi-stage build)
- `Dockerfile.dev` - Development образ с hot-reload
- `docker-compose.yml` - Оркестрация сервисов
- `.dockerignore` - Исключения для Docker build

## Порты

- `4321` - Основной порт приложения

## Сети

Все сервисы работают в единой сети `profreport-network` для возможности коммуникации между контейнерами.

## Troubleshooting

### Порт занят

Если порт 4321 уже используется, измените маппинг портов в `docker-compose.yml`:

```yaml
ports:
  - "3000:4321"  # теперь доступно на localhost:3000
```

### Проблемы с node_modules

Если возникают проблемы с зависимостями:

```bash
# Удалить volumes и пересобрать
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Hot-reload не работает

Убедитесь, что volume правильно настроен в docker-compose.yml:

```yaml
volumes:
  - .:/app
  - /app/node_modules
```
