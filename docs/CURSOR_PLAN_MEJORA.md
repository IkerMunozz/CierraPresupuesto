# Plan de mejora (Cursor) — CierraPresupuesto

> Documento para revisión integral y ejecución por un equipo de desarrollo.  
> Enfoque: **robustez**, **escalabilidad**, **seguridad**, **calidad** e **integración con IA**.

---

## 1) Introducción

**CierraPresupuesto** es una aplicación web (Next.js App Router + React + TypeScript) dirigida a autónomos y PYMES para:

- Generar presupuestos/propuestas comerciales con IA
- Analizar la propuesta (score 0–100, feedback, riesgos, competitividad)
- Producir una versión mejorada orientada a conversión

La autenticación se gestiona con **NextAuth** (Credentials demo/local + Google + Email).

### Objetivo general

Transformar el MVP en una solución **lista para producción**: mantenible, segura, con persistencia real, con IA confiable y con UX sólida.

---

## 2) Análisis actual (hallazgos)

### 2.1 Backend/API

- `app/api/generate/route.ts` orquesta el flujo end-to-end (validación + llamadas a generación/análisis/mejora).
- No hay **rate limiting** ni control de abuso/coste en el endpoint.
- El contrato request/response se valida manualmente; falta un esquema compartido.

### 2.2 Integración OpenAI

- `lib/openai.ts` usa `fetch` directo, sin:
  - retries con backoff,
  - timeout controlado,
  - configuración por entorno (modelo/temperature/max_tokens),
  - observabilidad (latencia/tokens/costes).
- El modelo está hardcodeado a `gpt-3.5-turbo` (riesgo: degradación/obsolescencia y falta de flexibilidad).

### 2.3 Quote engine

- `lib/quoteEngine.ts` contiene:
  - prompts de generación/análisis/mejora,
  - mocks cuando no hay API key,
  - parsing de JSON “best effort”.
- Riesgo de crecer como “god module” (baja separación de responsabilidades).

### 2.4 Auth/Seguridad

- `lib/auth.ts` habilita providers según env.
- Falta persistencia real (adapter de BD) para usuarios/sesiones y gestión completa de cuentas.
- Falta protección server-side consistente para rutas privadas (`/app`), y hardening de cookies/sesión.

### 2.5 Frontend/UX

- `components/QuoteApp.tsx` concentra:
  - estado del formulario,
  - llamada a `/api/generate`,
  - estado de error/loading,
  - historial en memoria (volátil).
- Validación de formularios y feedback pueden robustecerse (mensajes por campo, esquema único).

### 2.6 Calidad / DevEx

- ESLint aún no está inicializado (Next muestra wizard al correr `npm run lint`).
- No hay tests, ni CI.
- Documentación básica: `README.md` necesita variables de entorno y guía de producción.

---

## 3) Propuestas de mejora por área (priorizadas)

### P0 — Seguridad, contratos y fiabilidad (máximo impacto)

#### 3.1 Contratos y validación compartida (cliente/servidor)

- **Crear schemas Zod** para:
  - input de generación (serviceType, description, price, clientType, context)
  - response (quote, analysis, improvedQuote)
- **Regla**: el server valida siempre; el client reutiliza el mismo esquema para UX.

**Beneficios**
- Reduce bugs, evita estados inconsistentes y acelera cambios futuros.

**Implementación (propuesta)**
- `lib/domain/quoteSchemas.ts`
  - `QuoteInputSchema`
  - `GenerateResponseSchema`
  - Tipos derivados: `z.infer<>`

#### 3.2 Endpoint `/api/generate` delgado + “use case”

- Mantener el route como capa HTTP:
  - parse request
  - validate
  - llama al caso de uso
  - map de errores a status codes
- Mover orquestación a:
  - `lib/usecases/generateQuoteBundle.ts`

**Beneficios**
- Aisla lógica de negocio, facilita tests unitarios e integración.

#### 3.3 Hardening OpenAI client (timeout + retries + config)

- Añadir:
  - timeout (AbortController)
  - retries con backoff (para 429/5xx/timeouts)
  - configuración por env: modelo, temperature, max_tokens
  - límites: tamaño máximo de prompt

**Implementación (propuesta)**
- `lib/openai.ts`:
  - `OPENAI_MODEL`, `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`
  - `OPENAI_TIMEOUT_MS` (opcional)
  - retry 2–3 intentos con backoff exponencial

#### 3.4 Rate limiting en `/api/generate`

- Controlar abuso/coste.
- Claves:
  - Por IP (si usuario no autenticado)
  - Por userId (si autenticado)

**Implementación (propuesta)**
- In-memory simple (MVP) o Upstash Redis (prod).
- Política inicial:
  - ejemplo: 20 requests / 10 min por IP y 60 / 10 min por usuario.

#### 3.5 Protección server-side de `/app`

- Evitar que la “privacidad” dependa solo del client.
- Opciones:
  - `middleware.ts` (redirige a `/login`)
  - o `getServerSession()` en `app/app/page.tsx` (server gate)

---

### P1 — Producción real (persistencia, auth, tests, observabilidad)

#### 3.6 Persistencia (BD) + historial real

- Integrar **PostgreSQL + Drizzle**.
- Guardar:
  - usuario
  - inputs del presupuesto
  - outputs (quote/análisis/improved)
  - timestamps y metadatos de uso

**Propuesta de tablas (mínimo)**
- `quotes`
  - `id`, `userId`, `createdAt`
  - `serviceType`, `description`, `price`, `clientType`, `context`
  - `quoteText`, `analysisJson`, `improvedText`
- `usage_events` (opcional P1)
  - `id`, `userId`, `createdAt`, `provider`, `model`, `latencyMs`, `tokensIn`, `tokensOut`, `costUsdApprox`, `status`

#### 3.7 NextAuth con adapter de BD

- Persistir:
  - users, accounts, sessions, verificationTokens
- Añadir callbacks para:
  - incluir `user.id` en session/JWT
  - roles (si aplica) o plan

#### 3.8 Observabilidad y control de costes IA

- Logging estructurado por request:
  - requestId
  - userId (si existe)
  - latencia de OpenAI
  - status (ok/error)
- Métricas:
  - requests por usuario/día
  - errores por tipo
  - coste aproximado

#### 3.9 Tests + CI

- Unit tests:
  - parse/validación de schemas
  - funciones del quote engine
  - normalización y parsing
- Integration tests:
  - `/api/generate` con mock de OpenAI
- CI:
  - typecheck + lint + test

---

### P2 — “Producto SaaS” (optimización y experiencia premium)

#### 3.10 Streaming de respuestas

- Mejor percepción de velocidad.
- Streaming del presupuesto mientras se genera.

#### 3.11 Moderación / safety

- Moderación de input (prompt injection y contenido sensible).
- Políticas de retención de datos y protección de PII.

#### 3.12 Background jobs / colas

- Si el uso crece o se añaden:
  - PDF, emails, informes, etc.

---

## 4) Propuesta de arquitectura objetivo (carpetas)

Estructura sugerida para crecer:

```
lib/
  domain/
    quoteSchemas.ts
  services/
    openaiClient.ts
  usecases/
    generateQuoteBundle.ts
app/
  api/
    generate/route.ts
components/
  ...
```

Reglas:
- **Domain**: contratos, schemas, tipos, utilidades puras.
- **Services**: integraciones externas (OpenAI/email/DB).
- **Usecases**: orquestación de “qué se hace”.
- **Routes**: capa HTTP (validación + mapping).

---

## 5) UX/Frontend: mejoras concretas

### P0

- Validación de formulario con schema (Zod) + errores por campo.
- Estados consistentes:
  - loading: bloquear inputs, mostrar progreso
  - error: mensajes accionables
  - empty: guiar al usuario
- Mejorar “copiar”:
  - feedback accesible (aria-live) o toast

### P1

- Persistir historial por usuario (BD) y mostrar:
  - listado paginado o “últimos 20”
  - abrir item previo
- Mejorar accesibilidad (Lighthouse):
  - focus visible
  - labels
  - contraste

### P2

- i18n si hay expansión
- onboarding y “first run” guiado

---

## 6) Seguridad: checklist mínimo (OWASP-friendly)

### P0
- Rate limit en endpoints costosos (`/api/generate`)
- No loggear secretos ni `Authorization`
- Validación estricta de inputs
- `NEXTAUTH_SECRET` configurado en producción

### P1
- Auditoría de dependencias (npm audit) y actualizaciones
- Políticas de CORS y headers (si aplica)
- Revisión de cookies secure/sameSite en prod

---

## 7) Siguiente paso recomendado (plan por entregables)

### Entregable A (P0) — “MVP endurecido”

- Schemas Zod compartidos
- Route delgado + use case
- OpenAI client con timeout/retries/config env
- Rate limit `/api/generate`
- Protección server-side `/app`
- ESLint + Prettier inicializados

### Entregable B (P1) — “Producción con usuarios reales”

- Postgres + Drizzle + migraciones
- NextAuth adapter + persistencia de usuarios/sesiones
- Historial real por usuario
- Tests + CI
- Métricas básicas de uso/coste IA

### Entregable C (P2) — “SaaS premium”

- Streaming
- Moderación y políticas de datos
- Colas/background jobs

---

## 8) Prompt operativo (para Cursor / equipo)

**Instrucciones**:
- Implementar primero todos los puntos P0 (Entregable A) con cambios incrementales.
- Asegurar que cada cambio mantiene compatibilidad con modo fallback (sin OpenAI key).
- No introducir dependencias pesadas sin justificar.
- Mantener tipado estricto y evitar `any`.

**Definición de “done” P0**:
- `/api/generate` validado por schema
- rate limit activo
- OpenAI wrapper con timeout + retry
- `/app` protegido server-side
- `npm run dev` funciona
- `npm run lint` no abre wizard y pasa (configurado)

