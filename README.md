# Рестораны Минска — Курсовой проект

SPA-приложение для поиска, бронирования и оценки ресторанов города Минска (Беларусь).

## Стек технологий

| Слой | Технология |
|------|-----------|
| Backend | Node.js, Express, Prisma ORM |
| База данных | PostgreSQL 16 |
| Аутентификация | JWT (jsonwebtoken + bcryptjs) |
| Frontend | React 18, React Router v6, Axios |
| Карта | Leaflet.js (OpenStreetMap) |
| Инфраструктура | Docker, Docker Compose, Nginx |

## Роли пользователей

| Роль | Возможности |
|------|------------|
| **Guest** | Просмотр ресторанов, регистрация, вход |
| **Client** | Бронирования, отзывы, избранное, бонусы |
| **Owner** | Управление рестораном, меню, столиками, аналитика |
| **Admin** | Блокировка пользователей, удаление отзывов |

## Структура проекта

```
Course_project/
├── backend/          # Express API + Prisma
│   ├── prisma/       # Schema + migrations + seed
│   └── src/
│       ├── config/
│       ├── middlewares/
│       ├── modules/  # auth, users, restaurants, reservations, reviews,
│       │             # menu, tables, favorites, bonuses, promotions, analytics
│       └── utils/
├── frontend/         # React SPA (Vite)
│   └── src/
│       ├── api/      # Axios per-module clients
│       ├── components/
│       ├── context/  # AuthContext
│       ├── pages/
│       └── router/   # ProtectedRoute
├── nginx/            # Reverse proxy config
└── docker-compose.yml
```

## Быстрый запуск через Docker

**Требования:** Docker Desktop, Docker Compose v2.

```bash
# Клонировать / перейти в папку проекта
cd Course_project

# Скопировать переменные окружения
copy backend\.env.example backend\.env

# Запустить все сервисы
docker compose up --build -d

# Применить миграции и засеять БД
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Приложение доступно по адресу: **http://localhost:8080**

## Запуск для разработки (dev mode)

В dev-режиме запускаем только PostgreSQL в Docker, а backend/frontend — локально.

### 1) Поднять только БД

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000  
Backend API: http://localhost:5000/api

### Остановить БД

```bash
docker compose -f docker-compose.dev.yml down
```

## Тестовые аккаунты (после seed)

| Роль | Email | Пароль |
|------|-------|--------|
| Admin | admin@restaurants.by | admin123 |
| Owner | owner@restaurants.by | owner123 |
| Client | client@restaurants.by | client123 |

## REST API — основные эндпоинты

### Аутентификация
```
POST   /api/auth/register     Регистрация (CLIENT / OWNER)
POST   /api/auth/login        Вход
GET    /api/auth/me           Профиль (auth)
PUT    /api/auth/me           Обновить профиль (auth)
```

### Рестораны
```
GET    /api/restaurants              Список (фильтр, сортировка)
GET    /api/restaurants/:id          Карточка ресторана
POST   /api/restaurants              Создать (OWNER)
PUT    /api/restaurants/:id          Обновить (OWNER)
DELETE /api/restaurants/:id          Удалить (OWNER/ADMIN)
```

### Бронирования
```
GET    /api/reservations/my                        Мои бронирования (CLIENT)
GET    /api/reservations/restaurant/:id            Бронирования ресторана (OWNER)
POST   /api/reservations                           Создать (CLIENT)
PATCH  /api/reservations/:id/cancel                Отменить (CLIENT/OWNER)
PATCH  /api/reservations/:id/confirm               Подтвердить (OWNER)
```

### Отзывы
```
GET    /api/reviews/restaurant/:id   Отзывы ресторана
POST   /api/reviews                  Создать (CLIENT)
PUT    /api/reviews/:id              Обновить (CLIENT)
DELETE /api/reviews/:id              Удалить (CLIENT/ADMIN)
```

### Избранное
```
GET    /api/favorites         Мои избранные (CLIENT)
POST   /api/favorites         Добавить (CLIENT)
DELETE /api/favorites/:rid    Удалить (CLIENT)
```

### Бонусы
```
GET    /api/bonuses/balance       Баланс (CLIENT)
GET    /api/bonuses/transactions  История (CLIENT)
POST   /api/bonuses/spend         Списать (CLIENT)
```

### Акции
```
GET    /api/promotions/restaurant/:id   Акции ресторана
POST   /api/promotions                  Создать (OWNER)
PUT    /api/promotions/:id              Обновить (OWNER)
DELETE /api/promotions/:id              Удалить (OWNER)
```

### Аналитика
```
GET    /api/analytics/restaurant/:id   Статистика (OWNER)
```

### Администрирование
```
GET    /api/users                  Все пользователи (ADMIN)
PATCH  /api/users/:id/block        Заблокировать (ADMIN)
PATCH  /api/users/:id/unblock      Разблокировать (ADMIN)
```

## Архитектура

Каждый backend-модуль следует трёхслойной архитектуре:

```
Router → Controller → Service → Prisma Client → PostgreSQL
```

- **Router** — HTTP-маршруты + middleware
- **Controller** — парсинг req/res, вызов сервиса
- **Service** — бизнес-логика, валидация
- **Prisma** — единственный слой, работающий с БД

## Переменные окружения (backend/.env)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/restaurants_db"
JWT_SECRET="your_strong_secret"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
```
