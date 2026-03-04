# Обзор системы

## Компоненты

### Dashboard (dashboard.monser-dm.nl)

- **Backend:** Laravel 12, Filament, Sanctum
- **Frontend:** Vue 3, Vite, PrimeVue (встроен в Laravel)
- **Функции:** вход по ник+пароль из игровой БД, профиль игрока, кнопка «Admin Panel»

### Admin Panel (admin.monser-dm.nl)

- **Тип:** standalone Vue 3 SPA (PrimeVue, Pinia)
- **Аутентификация:** через dashboard. Пользователь нажимает «Admin Panel» → получает одноразовый токен → редирект на admin с `?token=...` → exchange-token → Bearer token в localStorage
- **Функции:** список админов, управление, логи (actions, warnings, purchases, GA), расширенные логи, новости, сервера

### Arkasha Bot (arkxa.ru)

- **Тип:** Laravel 11, VK callback
- **Функции:** команды в беседах VK, интеграция с форумом, Discord, Monser Tools
- **Связь с dashboard:** общие БД (игровая, бот), Tools API

## Поток аутентификации

1. Игрок входит в dashboard: сервер, ник, пароль → проверка в `a27ccount` (игровая БД)
2. При успехе — Sanctum token
3. Админ (level >= 1) нажимает «Admin Panel» → `POST /api/admin/prepare-redirect` → 64-символьный токен в Cache (TTL 5 мин)
4. Редирект на `admin.monser-dm.nl?token=...`
5. Admin SPA вызывает `POST /api/admin/exchange-token` → получает Bearer token
6. Admin Session: разблокировка сервера (unlock) — TTL 60 мин на сервер
7. Все запросы в admin идут с `Authorization: Bearer <token>` к dashboard API

## БД

- **Game DB** (gangwar, gangwar2, gangwar3) — аккаунты, админы, игровые данные
- **Bot DB** (monser_bot) — беседы, пользователи бота, nicknames
- **Dashboard Laravel** — sqlite/mysql для сессий, Sanctum, Filament
