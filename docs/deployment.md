# Деплой

## Запуск для разработки

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install && npm run build

composer dev   # server + queue + pail + vite
```

## Переменные окружения (.env)

### Обязательные

| Переменная | Описание |
|------------|----------|
| APP_KEY | Ключ приложения |
| APP_URL | URL dashboard (например https://dashboard.monser-dm.nl) |
| GAME_DB_HOST, GAME_DB_PORT, GAME_DB_USERNAME, GAME_DB_PASSWORD | Игровая БД (для auth, профиля) |
| BOT_DB_HOST, BOT_DB_PORT, BOT_DB_DATABASE, BOT_DB_USERNAME, BOT_DB_PASSWORD | БД бота (для логов и т.п.) |

### Sanctum и сессии

| Переменная | Описание |
|------------|----------|
| SANCTUM_STATEFUL_DOMAINS | Домены для Sanctum (admin.monser-dm.nl и др.) |
| SESSION_DOMAIN | Домен сессии (или null) |
| SESSION_SECURE_COOKIE | true для HTTPS |
| SESSION_DRIVER | database или redis |

### CORS и Admin

| Переменная | Описание |
|------------|----------|
| CORS_ALLOWED_ORIGINS | Разрешённые origin (admin SPA) |
| VITE_ADMIN_URL | URL админ-панели |
| TRUSTED_PROXIES | Прокси (IP или *) |

### Laravel

- DB_CONNECTION, DB_* — локальная БД Laravel (sqlite или mysql)
- QUEUE_CONNECTION — database или redis
- REDIS_* — если используется Redis

## Admin Panel (admin.monser-dm.nl)

Отдельный репозиторий. Переменные:

- `VITE_DASHBOARD_URL` — URL dashboard (редирект при 401)
- `VITE_API_URL` — URL API (например https://dashboard.monser-dm.nl/api)

## Filament

Dashboard использует Filament для админки Laravel (если есть). После `composer install` может потребоваться `php artisan filament:upgrade`.
