# Contributing a CierraPresupuesto

Este repositorio es un MVP en evolución. Estas pautas buscan mantener consistencia, calidad y seguridad en las contribuciones.

## Requisitos

- Node.js (recomendado: 18+ / 20+)
- npm

## Setup local

```bash
npm install
```

Crear `.env.local` (ver `README.md`).

Ejecutar:

```bash
npm run dev
```

## Estándares de código

- **TypeScript**: tipado estricto, evitar `any` salvo casos justificados.
- **App Router**: mantener separación entre Server Components y Client Components (`'use client'`).
- **Validación**: preferir schemas compartidos (ej. Zod) para cliente y servidor.
- **Errores**: mensajes claros y accionables; no filtrar secretos en logs.
- **UX**: estados consistentes (loading/error/empty), accesibilidad (labels/focus/contraste).

## Estructura recomendada (a medida que crezca)

- `lib/domain/`: tipos + schemas (contratos)
- `lib/services/`: clientes externos (Gemini, email, etc.)
- `lib/usecases/`: orquestación de casos de uso (ej. generar/analisar/mejorar)
- `app/api/`: capa HTTP delgada (validación + mapping de errores)
- `components/`: UI reutilizable

## Commits

Recomendación: mensajes cortos y descriptivos.

- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `refactor:` cambios internos sin cambio funcional
- `docs:` documentación
- `test:` tests
- `chore:` mantenimiento

Ejemplos:
- `feat: add rate limiting to generate endpoint`
- `fix: handle Gemini timeout errors`

## Pull Requests

Antes de abrir PR:

- El proyecto compila y corre en local.
- No se incluyen secretos (nunca subir `.env*`).
- Cambios acotados y con descripción clara.
- Si aplica: tests y/o evidencia manual (capturas o pasos).

Template sugerido en la descripción del PR:

```md
## Summary
- ...

## Test plan
- [ ] `npm run dev`
- [ ] Probar flujo en `/app`
```

## Seguridad

- No registrar ni persistir contenido sensible sin necesidad.
- Proteger endpoints de coste (como `/api/generate`) ante abuso.
- Usar variables de entorno para claves y secretos.

