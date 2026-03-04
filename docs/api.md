# API

Базовый путь: `/api`

## Аутентификация

- Sanctum Bearer token в заголовке `Authorization`
- Исключение: `POST /api/auth/login` и `POST /api/admin/exchange-token` — публичные

## Группы маршрутов

### Публичные

| Метод | Путь | Throttle | Описание |
|-------|------|----------|----------|
| POST | /auth/login | login | Вход (server, nickname, password) |
| POST | /admin/exchange-token | token-exchange | Обмен одноразового токена на Bearer |

### С auth:sanctum

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /auth/logout | Выход |
| GET | /auth/user | Текущий пользователь |
| GET | /account/profile | Профиль аккаунта |
| GET | /logs | Логи |
| GET | /logs/types | Типы логов |
| GET | /logs/person/{personId}/{server} | Логи по персоне |
| POST | /cp/prepare | Токен для CP (требуется unlock) |
| POST | /admin/prepare-redirect | Токен для редиректа в админку |

### Admin (auth:sanctum + admin)

| Метод | Путь | Throttle | Описание |
|-------|------|----------|----------|
| POST | /admin/auth | admin-auth | Аутентификация в админке |
| GET | /admin/session/status | — | Статус сессии |

### Admin + unlocked

Все маршруты ниже требуют `auth:sanctum`, `admin`, `admin.unlocked`:

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /admin/me | Текущий админ |
| GET | /admin/me/norm-history | История норм |
| GET | /admin/list | Список админов |
| GET | /admin/{adminId} | Админ по ID |
| POST | /admin/manage | Выполнить действие |
| POST | /admin/manage/add | Добавить админа |
| GET | /admin/manage/{adminName}/actions | Доступные действия |
| GET | /admin/manage/{adminName}/history | История |
| GET | /admin/manage/{adminName}/norm-history | История норм |
| GET | /admin/logs/actions | Логи действий |
| GET | /admin/logs/warnings | Предупреждения |
| GET | /admin/logs/purchases | Покупки |
| POST | /admin/logs/purchases/confirm | Подтвердить покупку |
| GET | /admin/logs/removed | Удалённые админы |
| GET | /admin/logs/ga-actions | Действия GA |
| GET | /admin/servers | Настройки серверов |
| POST | /admin/servers | Обновить настройки |
| GET/POST/PUT/DELETE | /admin/news, /admin/news/{id} | Новости |
| GET | /admin/extended/servers | Серверы для extended |
| GET | /admin/players/search | Поиск игрока |
| GET | /admin/players/search/advanced | Расширенный поиск |
| GET | /admin/players/{accountId} | Статистика игрока |
| GET | /admin/extended/reputation | Логи репутации |
| GET | /admin/extended/nicknames | Логи ников |
| GET | /admin/extended/unbans | Логи разбанов |
| GET | /admin/extended/bans | Перманентные баны |
| PATCH | /admin/extended/bans/{banId}/reason | Изменить причину бана |
| GET | /admin/extended/ip-bans | Баны по IP |
| GET | /admin/extended/matchmaking | Матчмейкинг |
| GET | /admin/extended/money-transfers | Переводы |
| GET | /admin/extended/accessories | Аксессуары |

Throttle `sensitive` — на чувствительных операциях (manage, confirm, servers).
