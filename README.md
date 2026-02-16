# Memo Game

Игра-викторина с бэкендом на FastAPI и фронтендом на React (Vite).

## Требования

- **Python 3.10+**
- **Node.js 18+** и npm

## Запуск проекта

### 1. Бэкенд (API)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API будет доступен по адресу: **http://127.0.0.1:8000**

**Пароль админки** задаётся переменной окружения `ADMIN_PASSWORD`. По умолчанию: `admin`.

### 2. Фронтенд

В отдельном терминале:

```bash
cd frontend
npm install
npm run dev
```

Приложение откроется по адресу: **http://localhost:5173**

---

Для работы приложения должны быть запущены и бэкенд, и фронтенд.

## Полезные команды

| Действие        | Команда              |
|-----------------|----------------------|
| Сборка фронта   | `cd frontend && npm run build` |
| Превью сборки   | `cd frontend && npm run preview` |
| Линт фронта     | `cd frontend && npm run lint`   |

## Деплой на сервер

Пароль админки на сервере задаётся переменной окружения `ADMIN_PASSWORD`. Способы:

**Через .env файл** (в каталоге `backend`):

```bash
ADMIN_PASSWORD=ваш_секретный_пароль
```

Дальше загрузить перед запуском:

```bash
export $(grep -v '^#' .env | xargs)
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Через systemd** — в `[Service]` секции unit-файла:

```ini
Environment="ADMIN_PASSWORD=ваш_секретный_пароль"
```

**Через Docker**:

```bash
docker run -e ADMIN_PASSWORD=ваш_секретный_пароль ...
```

**При запуске вручную**:

```bash
ADMIN_PASSWORD=ваш_секретный_пароль uvicorn main:app --host 0.0.0.0
```
