# Monser Dashboard документация

Личный кабинет SAMP-серверов Monser DM. Backend (Laravel) и фронтенд (Vue). Точка входа для админ-панели.

**Связанные проекты:** [Arkasha Bot](../../arkxa.ru/docs/) — VK-бот для бесед администрации.

---

## Содержание

- [Обзор системы](overview.md) — схема, связь dashboard, admin, бота
- [Админ-панель](admin-panel.md) — редирект, unlock, разделы
- [API](api.md) — endpoints, throttle
- [Деплой](deployment.md) — env, CORS, Sanctum

---

## Схема системы

```mermaid
flowchart TB
    subgraph users [Пользователи]
        P[Игрок]
        A[Админ]
    end
    
    subgraph dash [dashboard.monser-dm.nl]
        L[Login]
        Prof[Profile]
        AP[Admin Panel Button]
    end
    
    subgraph admin [admin.monser-dm.nl]
        AdmUI[Admins / Logs / Extended / Manage]
    end
    
    subgraph bot [arkxa.ru]
        VK[VK Webhook]
        Cmd[Commands]
    end
    
    subgraph data [Данные]
        GameDB[(Game DB)]
        BotDB[(Bot DB)]
        Redis[(Redis)]
    end
    
    P --> L
    A --> L
    L --> Prof
    A --> AP
    AP -->|token| AdmUI
    L --> GameDB
    Cmd --> BotDB
    Cmd --> GameDB
    Cmd --> Redis
    VK --> Cmd
```
