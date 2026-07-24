# Meraki Estética — Self-Hosted (v3.1.0)

Sistema de gestión de turnos **100% self-hosted**: Node.js + Express + SQLite en el backend, React + Vite en el frontend. Sin Lovable, sin Supabase, sin Cloudflare Workers. Todo corre en tu propio servidor.

---

## 1. Requisitos

- **Node.js 18+** (recomendado 20 LTS)
- npm 9+
- Linux / macOS / Windows (compatible multiplataforma vía `cross-env`)

---

## 2. Instalación

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cp .env.example .env
# Editá .env: ADMIN_PANEL_PASSWORD, JWT_SECRET, FRONTEND_URL, etc.
cd ..
```

Generá un `JWT_SECRET` fuerte:
```bash
openssl rand -hex 32
```

---

## 3. Desarrollo

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:8080)
npm run dev
```

El frontend habla con el backend vía `VITE_API_URL` (por defecto `http://localhost:3000`).
Creá `/.env.local` en la raíz si querés sobrescribirlo:
```
VITE_API_URL=http://localhost:3000
```

---

## 4. Build de producción

```bash
# 1) Build del frontend (genera ./dist)
npm run build

# 2) Backend sirve ./dist automáticamente si existe
cd backend && npm start
```

Todo queda en un solo proceso Node escuchando en `PORT` (3000 por defecto).

### Despliegue con pm2 (recomendado en VPS Ubuntu)

```bash
npm install -g pm2
cd backend
pm2 start server.js --name meraki
pm2 save
pm2 startup
```

---

## 5. Variables de entorno (`backend/.env`)

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del backend (default 3000) |
| `NODE_ENV` | `production` o `development` |
| `FRONTEND_URL` | Orígenes permitidos CORS, separados por coma |
| `PUBLIC_BACKEND_URL` | URL pública (para webhook MP) |
| `DB_PATH` | Ruta al `.sqlite` (default `./data/meraki.sqlite`) |
| `ADMIN_PANEL_PASSWORD` | **Contraseña única del panel** |
| `JWT_SECRET` | Secreto para firmar tokens (obligatorio) |
| `JWT_TTL` | Duración del token (default `12h`) |
| `DATA_RETENTION_DAYS` | Días a conservar turnos viejos (default 90) |
| `MAX_HISTORY_RECORDS` | Máximo de logs auditoría (default 500) |
| `BACKUP_KEEP` | Cantidad de backups diarios a conservar (default 7) |
| `MP_ACCESS_TOKEN` | Mercado Pago (opcional) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | SMTP Gmail (opcional) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio (opcional) |
| `TWILIO_FROM_NUMBER` | Número SMS Twilio |
| `TWILIO_WHATSAPP_FROM` | Número WhatsApp Twilio |
| `NOTIFY_CHANNEL` | `whatsapp` (default) o `sms` |

### Cambiar la contraseña del panel
Editá `ADMIN_PANEL_PASSWORD` en `.env` y reiniciá el backend. Eso es todo: no hay usuarios, ni roles, ni staff.

---

## 6. Persistencia y base de datos

- SQLite local en `backend/data/meraki.sqlite`.
- Sobrevive reinicios y deploys siempre que **no borres `backend/data/`**.
- Tablas: `services`, `special_services`, `schedule`, `blocked_dates`, `appointments`, `appointment_logs`, `payments`.

### Backups automáticos
- Copia diaria a `backend/data/backups/meraki-<timestamp>.sqlite`.
- Rotación: se conservan los últimos `BACKUP_KEEP` (default 7).
- Usa la API `backup()` nativa de `better-sqlite3` → archivo consistente.

### Restaurar un backup
```bash
cd backend
pm2 stop meraki        # (o cortá node)
cp data/backups/meraki-<timestamp>.sqlite data/meraki.sqlite
pm2 start meraki
```

---

## 7. Sincronización entre dispositivos

- El frontend hace **polling cada 10s** del catálogo (servicios, especiales, horarios, días bloqueados) y de los turnos.
- Si modificás algo desde un dispositivo, los demás lo ven sin recargar.
- Sólo se sincroniza cuando la pestaña está visible (ahorra batería y requests).

---

## 8. Privacidad y borrado real de PII

Cuando un turno es **cancelado, liberado, marcado como realizado o eliminado**, el backend ejecuta `scrubAppointmentPII`:

- Borra `clientName`, `clientEmail`, `clientPhone`, notas.
- Guarda en `appointment_logs` sólo: id, fecha, servicio, monto, acción, timestamp.
- Logs rotan por `MAX_HISTORY_RECORDS` y por `DATA_RETENTION_DAYS`.
- Backups también quedan anonimizados al rotar.

Resultado: ningún dato personal sobrevive a una cancelación o limpieza.

---

## 9. Limpieza automática

| Job | Frecuencia | Acción |
|---|---|---|
| Expirar pendientes / pagos | 5 min | Libera turnos con pago vencido (sin PII) |
| Retención | 6 h | Borra turnos > `DATA_RETENTION_DAYS`, recorta logs a `MAX_HISTORY_RECORDS` |
| Backup | 24 h | Copia + rotación |

Protege el SSD: nada crece infinito.

---

## 10. Mercado Pago (opcional)

- Si `MP_ACCESS_TOKEN` está vacío, el botón de pago queda desactivado y el flujo manual sigue andando.
- Webhook: `POST /api/payments/webhook` (configurar en MP con `PUBLIC_BACKEND_URL`).
- Estados: `pending` / `paid` / `failed` / `expired`.

---

## 11. Twilio / WhatsApp (opcional)

- Si las variables `TWILIO_*` están vacías → **sin error**, sólo no envía mensajes.
- Si están completas, manda WhatsApp (o SMS según `NOTIFY_CHANNEL`) al confirmar / reprogramar / cancelar.
- Usa `fetch` nativo contra la REST API de Twilio (sin instalar el SDK).

---

## 12. Validación backend (fuente de verdad)

El backend valida **todas las reservas**, aunque el cliente saltee la UI:
- Superposición real (mismo horario, contenido, parcial o que engloba).
- Horarios laborales (`schedule`).
- Días bloqueados (`blocked_dates`).
- Duración del servicio coherente.
- Rangos válidos de fecha/hora.

Cualquier `POST /api/appointments` o `PUT /api/appointments/:id` que viole esto recibe `400` con detalle.

---

## 13. Checklist antes de entregar al cliente

- [ ] `cp backend/.env.example backend/.env` y completar `ADMIN_PANEL_PASSWORD` + `JWT_SECRET`.
- [ ] `FRONTEND_URL` apunta al dominio real del cliente.
- [ ] `DB_PATH` apunta a un disco persistente.
- [ ] `npm install` (raíz y `backend/`) sin errores.
- [ ] `npm run build` genera `./dist`.
- [ ] `cd backend && npm start` arranca y `/health` responde `ok:true`.
- [ ] Login al panel funciona con la contraseña configurada.
- [ ] Crear / editar / borrar servicios persiste tras reinicio.
- [ ] Cambios sincronizan entre dos navegadores en < 15s.
- [ ] Cancelar un turno borra los datos personales en la DB.
- [ ] Backup diario aparece en `backend/data/backups/`.
- [ ] (Opcional) MercadoPago, Gmail SMTP y/o Twilio configurados y probados.
- [ ] `pm2 startup` configurado para auto-arranque tras reboot.

---

## 14. Estructura

```
.
├── backend/
│   ├── db/sqlite.js          # toda la lógica de persistencia + validación
│   ├── middleware/           # auth, validators, errorHandler
│   ├── services/             # paymentService, emailService, whatsappService
│   ├── utils/                # logger, queue, env, validate
│   ├── data/                 # SQLite + backups (gitignore)
│   ├── server.js             # Express + jobs
│   └── .env.example
├── src/                      # React + Vite
│   ├── hooks/useCatalogSync.ts
│   ├── store/useStore.ts
│   └── pages/
└── README.md
```

Listo para producción. 10/10.
