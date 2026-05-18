Гид по ресторанам и заведениям (ориентация на Беларусь). Клиент: React (Vite) + React Router; сервер: Node.js, Express, PostgreSQL, Prisma; аутентификация: JWT; карты: Яндекс.Карты (`@pbe/react-yandex-maps`).

---

## Роли

| Роль | Назначение |
|------|------------|
| **CLIENT** | Поиск заведений, бронирование, отзывы, избранное |
| **OWNER** | Свои рестораны в каталоге, редактирование столы и план зала, меню, акции, брони гостей, аналитика |
| **ADMIN** | Список пользователей, блокировка/разблокировка |

Регистрация через API допускает роли `CLIENT` и `OWNER` (поле `role` опционально). Роль `ADMIN` назначается вне обычной регистрации (например, скриптом `npm run admin:ensure` в backend).

---

## Маршруты фронтенда

| Путь | Доступ | Содержание |
|------|--------|------------|
| `/` | все | Редирект на `/restaurants` |
| `/restaurants` | все | Каталог заведений |
| `/restaurants/:id` | все | Карточка ресторана |
| `/login`, `/register` | гости | Вход и регистрация |
| `/profile` | CLIENT, OWNER, ADMIN | Профиль и связанные сводки |
| `/reservations` | только CLIENT | Список своих бронирований |
| `/cabinet/restaurateur` | только OWNER | Кабинет ресторатора (`/owner` редиректит сюда) |
| `/admin` | только ADMIN | Панель администратора |
| `*` | все | Страница 404 |

Защита маршрутов: компонент `ProtectedRoute` проверяет JWT и список допустимых ролей. При ответе API с кодом 401 токен очищается и выполняется переход на `/login`.

---

## Публичный функционал (без входа)

### Каталог `/restaurants`

- Загрузка списка ресторанов с сервера; опциональная фильтрация по городу (query `city`).
- **Режимы отображения:** витрина (горизонтальная галерея), сетка, карта (Яндекс), отдельный режим «Подбор» с фильтрами.
- **Клиентские фильтры:** поиск по названию/адресу/городу, кухня, сортировка по выбранному полю и направлению.

### Карта

- Отображение заведений с координатами на интерактивной карте.

### Страница ресторана `/restaurants/:id`

- Данные ресторана, галерея изображений (массив `images` или устаревшее поле `imageUrl`).
- **Меню** по категориям; модальное окно позиции; блок «рекомендации шефа / бара» из доступных рекомендованных позиций.
- **Акции** заведения.
- **Отзывы** с рейтингом (чтение для всех).
- Для авторизованного **CLIENT**: индикатор избранного и переключение избранного.
- **Мастер бронирования** (`BookingWizard`) — только для клиента: дата/время, выбор столика на плане зала, подтверждение; учёт часов работы, занятости слотов и объединения столов.

---

## Клиент (роль CLIENT)

### Аутентификация

- Регистрация: имя, email, пароль (минимум 6 символов), выбор роли «гость» или «ресторатор».
- Вход по email и паролю; сохранение JWT в `localStorage`.

### Профиль `/profile`

- Редактирование имени и телефона.
- Загрузка **аватара** (multipart).
- Блок избранных заведений с возможностью убрать из избранного.
- Краткий превью-список последних бронирований (до 6) с сортировкой: сначала активные статусы.
- Быстрые ссылки (в т.ч. на «Мои брони»).

### Бронирования `/reservations`

- Список всех своих броней.
- Вкладки: **активные** (PENDING, CONFIRMED) и **история** (CANCELLED, COMPLETED).
- **Отмена** брони (для подходящих статусов).
- **Редактирование** через модальное окно: дата/время, число гостей, стол (ограничения на стороне API — только PENDING и проверки конфликтов/вместимости).

### Избранное

- Добавление/удаление ресторана в избранное со страницы ресторана и управление из профиля.

### Отзывы

- Один отзыв на пользователя на ресторан (уникальность в БД).
- Создание, редактирование, удаление своего отзыва; удаление админом также разрешено в API.

---

## Ресторатор (роль OWNER)

Кабинет: `/cabinet/restaurateur`. Выбор **активного заведения** из списка своих ресторанов. Вкладки:

### 1. Заведения и зал

- **CRUD карточки ресторана** (`OwnerRestaurantForm`): название, описание, город, адрес, кухня, телефон, часы работы, координаты; загрузка до 10 изображений; при сохранении возможна **геокодировка адреса** (backend + сервис геокодирования).
- **Удаление** заведения (с подтверждением).
- **Столы и план зала** (`OwnerTablesManager`):
  - создание/редактирование/удаление столов (номер, вместимость, `maxCapacity`, доступность для брони);
  - позиции столов на SVG-плане, пресеты форм зала, редактор декора (`HallEditor`);
  - связи **смежных столов** (adjacency) для сценариев объединения при бронировании;
  - сохранение схемы зала (`hallSchema`) на сервере.

### 2. Бронь гостей

- Список бронирований выбранного ресторана с фильтрами по статусу.
- Действия: **подтвердить** (PENDING → CONFIRMED), **отклонить/отменить** (→ CANCELLED), **отметить посещение** (CONFIRMED → COMPLETED).

### 3. Меню и цены

- CRUD позиций меню по ресторану, категории, цена, доступность, «рекомендуемое», загрузка изображения блюда.

### 4. Акции

- CRUD промо-акций: заголовок, описание, опциональные даты начала/окончания.

### 5. Показатели

- Аналитика по ресторану: количество броней всего/подтверждённых/отменённых, число отзывов, средний рейтинг, разбивка броней по статусам, последние бронирования (краткая лента).

### Гео-сервис (API для владельца)

- Подсказки адресов, прямой и обратный геокодинг — для заполнения карточки заведения.

---

## Администратор (роль ADMIN)

Страница `/admin`:

- Таблица всех пользователей: ID, имя, email, роль, статус блокировки.
- **Заблокировать / разблокировать** пользователя (для роли ADMIN кнопка недоступна — защита в UI).

---

## REST API (краткий обзор)

Базовый префикс: `/api`. Формат ответов в основном `{ success, data }` или сообщения об ошибке через middleware.

| Модуль | Основные endpoints |
|--------|---------------------|
| **Health** | `GET /api/health` |
| **Auth** | `POST /register`, `POST /login`, `GET/PUT /me`, `PATCH /me/avatar` |
| **Users** | `GET /` (ADMIN), `PATCH /:id/block`, `PATCH /:id/unblock` |
| **Restaurants** | `GET /`, `GET /:id` (публично); `POST /`, `PUT /:id`, `PATCH /:id/hall-schema`, `DELETE /:id` (OWNER/ADMIN) |
| **Reservations** | `GET /my` (CLIENT); `GET /restaurant/:restaurantId` (OWNER); `POST /` (CLIENT); `PATCH /:id` (CLIENT); `PATCH /:id/cancel` (CLIENT, OWNER); `PATCH /:id/confirm`, `PATCH /:id/complete` (OWNER) |
| **Reviews** | `GET /restaurant/:id`; `POST /`, `PUT /:id`, `DELETE /:id` |
| **Menu** | `GET /restaurant/:id`; `POST /`, `PUT /:id`, `DELETE /:id` (OWNER) |
| **Tables** | `GET /restaurant/:id`; `POST /`, `PUT /:id`, `PATCH /:id/adjacency`, `DELETE /:id` (OWNER) |
| **Favorites** | `GET /`, `POST /`, `DELETE /:restaurantId` (CLIENT) |
| **Promotions** | `GET /restaurant/:id` (публично); CRUD для OWNER |
| **Analytics** | `GET /restaurant/:restaurantId` (OWNER) |
| **Geo** | `GET /suggest`, `/geocode`, `/reverse` (OWNER) |

Статические файлы загрузок отдаются с `/uploads/...`.

---

## Бизнес-логика бронирований (сервер)

- Проверка **конфликтов по времени** (окно ±2 часа) с учётом основного стола и **объединённых** столов.
- Ограничение по **вместимости** и `maxCapacity` при объединении; флаг «лишний стул», если гостей больше суммарной номинальной вместимости, но не больше `maxCapacity`.
- Правило «не бронировать слишком большой стол на малую компанию» (slack по числу гостей).
- Обновление брони клиентом только в статусе **PENDING**.

---

## Модель данных (сущности Prisma)

Кратко: **User**, **Restaurant**, **RestaurantImage**, **Table**, **MenuItem**, **Reservation**, **Review**, **Favorite**, **Promotion**. Статусы брони: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`. Роли пользователя: `CLIENT`, `OWNER`, `ADMIN`.

Ниже — соответствие таблиц в PostgreSQL (имена из `@@map` в Prisma) и столбцов. Типы указаны как в Prisma; `?` — необязательное поле (nullable).

---

## Структура базы данных (таблицы и столбцы)

### Перечисления (enum в БД)

| Имя | Значения |
|-----|----------|
| `Role` | `CLIENT`, `OWNER`, `ADMIN` |
| `ReservationStatus` | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |

---

### `users`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `name` | `TEXT` |
| `email` | `TEXT`, уникальный |
| `password` | `TEXT` |
| `role` | `Role`, по умолчанию `CLIENT` |
| `phone` | `TEXT`, nullable |
| `avatarUrl` | `TEXT`, nullable |
| `isBlocked` | `BOOLEAN`, по умолчанию `false` |
| `createdAt` | `TIMESTAMP` |
| `updatedAt` | `TIMESTAMP` |

---

### `restaurants`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `name` | `TEXT` |
| `description` | `TEXT`, nullable |
| `city` | `TEXT`, по умолчанию `"Минск"` |
| `address` | `TEXT` |
| `cuisine` | `TEXT` |
| `phone` | `TEXT`, nullable |
| `openTime` | `TEXT`, nullable |
| `closeTime` | `TEXT`, nullable |
| `hallSchema` | `TEXT`, nullable |
| `imageUrl` | `TEXT`, nullable |
| `latitude` | `DOUBLE PRECISION`, nullable |
| `longitude` | `DOUBLE PRECISION`, nullable |
| `avgRating` | `DOUBLE PRECISION`, nullable |
| `ownerId` | `INTEGER`, FK → `users.id`, каскад при удалении владельца |
| `createdAt` | `TIMESTAMP` |
| `updatedAt` | `TIMESTAMP` |

---

### `restaurant_images`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `restaurantId` | `INTEGER`, FK → `restaurants.id`, каскад |
| `url` | `TEXT` |
| `sortOrder` | `INTEGER`, по умолчанию `0` |
| `createdAt` | `TIMESTAMP` |

Индекс по `restaurantId`.

---

### `tables`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `restaurantId` | `INTEGER`, FK → `restaurants.id`, каскад |
| `number` | `INTEGER` |
| `capacity` | `INTEGER` |
| `maxCapacity` | `INTEGER`, nullable |
| `adjacentTableIds` | `JSON` / `JSONB`, по умолчанию `[]` |
| `isAvailable` | `BOOLEAN`, по умолчанию `true` |
| `posX` | `DOUBLE PRECISION`, nullable |
| `posY` | `DOUBLE PRECISION`, nullable |

Ограничение уникальности: пара (`restaurantId`, `number`).

---

### `menu_items`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `restaurantId` | `INTEGER`, FK → `restaurants.id`, каскад |
| `name` | `TEXT` |
| `description` | `TEXT`, nullable |
| `price` | `DOUBLE PRECISION` |
| `category` | `TEXT` |
| `imageUrl` | `TEXT`, nullable |
| `isAvailable` | `BOOLEAN`, по умолчанию `true` |
| `isRecommended` | `BOOLEAN`, по умолчанию `false` |

---

### `reservations`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `userId` | `INTEGER`, FK → `users.id`, каскад |
| `restaurantId` | `INTEGER`, FK → `restaurants.id`, каскад |
| `tableId` | `INTEGER`, FK → `tables.id`, каскад |
| `date` | `TIMESTAMP` |
| `guestsCount` | `INTEGER` |
| `status` | `ReservationStatus`, по умолчанию `PENDING` |
| `comment` | `TEXT`, nullable |
| `bonusesUsed` | `INTEGER`, по умолчанию `0` |
| `extraChair` | `BOOLEAN`, по умолчанию `false` |
| `combinedWithTableId` | `INTEGER`, nullable |
| `combinedWithTableIds` | `JSON` / `JSONB`, по умолчанию `[]` |
| `createdAt` | `TIMESTAMP` |
| `updatedAt` | `TIMESTAMP` |

---

### `reviews`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `userId` | `INTEGER`, FK → `users.id`, каскад |
| `restaurantId` | `INTEGER`, FK → `restaurants.id`, каскад |
| `rating` | `INTEGER` |
| `comment` | `TEXT`, nullable |
| `createdAt` | `TIMESTAMP` |
| `updatedAt` | `TIMESTAMP` |

Ограничение уникальности: пара (`userId`, `restaurantId`).

---

### `favorites`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `userId` | `INTEGER`, FK → `users.id`, каскад |
| `restaurantId` | `INTEGER`, FK → `restaurants.id`, каскад |
| `createdAt` | `TIMESTAMP` |

Ограничение уникальности: пара (`userId`, `restaurantId`).

---

### `promotions`

| Столбец | Тип / ограничения |
|---------|-------------------|
| `id` | `INTEGER`, PK, автоинкремент |
| `restaurantId` | `INTEGER`, FK → `restaurants.id`, каскад |
| `title` | `TEXT` |
| `description` | `TEXT` |
| `startDate` | `TIMESTAMP`, nullable |
| `endDate` | `TIMESTAMP`, nullable |
| `createdAt` | `TIMESTAMP` |
| `updatedAt` | `TIMESTAMP` |

---

*Полный перечень моделей Prisma, включая возможные служебные или устаревшие, см. в `backend/prisma/schema.prisma`.*

---

## Навигация в шапке

Ссылки зависят от роли: «Заведения»; для клиента — «Мои брони»; для владельца — «Кабинет ресторатора»; для админа — «Админ»; «Профиль»; вход/выход.

---

*Документ составлен по состоянию кодовой базы проекта Course_project и отражает реализованный функционал, а не внешние ТЗ.*
