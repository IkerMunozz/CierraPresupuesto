# CierraPresupuesto

Aplicación web (MVP) para **autónomos y PYMES** que genera **presupuestos comerciales**, los **analiza** (score + feedback + riesgos + competitividad) y produce una **versión mejorada** usando IA.

- **Frontend**: Next.js (App Router) + React + TypeScript + Tailwind
- **Backend**: API Routes (`/app/api/*`)
- **IA**: Gemini (Google Generative AI)
- **Auth**: NextAuth (Credentials demo/local + Google + Email)

## Funcionalidades

- **Generación**: crea una propuesta lista para copiar/pegar en email o PDF
- **Análisis**: score 0–100 + feedback y riesgos de perder la venta
- **Mejora**: reescritura optimizada para conversión
- **Historial**: persistencia en base de datos PostgreSQL
- **Streaming**: visualización en tiempo real de la generación del presupuesto

## Estructura del proyecto (rutas)

- **`/`**: landing (marketing + precios + guías + FAQ)
- **`/app`**: generador (formulario + resultados + recientes)
- **`/login`** y **`/register`**: acceso con correo (demo) y botón Google si está configurado
- **`/guias`** y **`/guias/[slug]`**: contenido/recursos

## Requisitos

- Node.js (recomendado: 18+ / 20+)
- npm

## Configuración (variables de entorno)

Crea un `.env.local` en la raíz del proyecto.

### Base de datos (PostgreSQL)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Rate limiting (Upstash Redis)

```env
UPSTASH_REDIS_REST_URL=https://tu-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=tu_token
```

### Gemini (Google AI Studio)

Si no defines `GEMINI_API_KEY`, la app usa **mocks realistas** para no bloquear el desarrollo.

```env
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=2048
```

### NextAuth (recomendado)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=un_secreto_largo_y_aleatorio
```

### Google OAuth (opcional)

Si no defines estas variables, el botón de Google **no aparece** en `/login` y `/register`.

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Email (Resend)

```env
RESEND_API_KEY=tu_api_key_de_resend
```

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Scripts

- `npm run dev`: desarrollo
- `npm run build`: build producción
- `npm run start`: servir build
- `npm run lint`: lint
- `npm run format`: formateo con Prettier
- `npm run db:generate`: generar migraciones Drizzle
- `npm run db:push`: aplicar migraciones a la DB

## Endpoints principales

- `POST /api/generate`: genera presupuesto + análisis + versión mejorada (`app/api/generate/route.ts`)
- `GET /api/history`: recupera el historial de presupuestos del usuario

## Archivos clave

- `app/api/generate/route.ts`: orquestación del flujo de generación
- `lib/quoteEngine.ts`: prompts + mocks + funciones generate/analyze/improve (exclusivo Gemini)
- `lib/gemini.ts`: wrapper de Gemini con reintentos y streaming
- `components/QuoteApp.tsx`: estado/flujo UI + recientes
- `components/Form.tsx`: formulario
- `components/Results.tsx`: render de presupuesto/análisis/mejora + copiar al portapapeles

## Roadmap (alto nivel)

Ver el plan detallado en `docs/CURSOR_PLAN_MEJORA.md`.
