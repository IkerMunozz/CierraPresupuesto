# Enterprise Dashboard Componentes

Dashboard de nivel enterprise para SaaS de presupuestos con IA, inspirado en Stripe, Notion y Linear.

## Componentes

### EnterpriseDashboard
Componente principal que integra todo el dashboard.

**Props:**
- `data`: DashboardData con todos los KPIs, gráficos, insights y datos
- `userName?: string` - Nombre del usuario para saludo personalizado

**Uso:**
```tsx
import { EnterpriseDashboard } from '@/components/dashboard';

<EnterpriseDashboard data={dashboardData} userName="Juan" />
```

### KPICard
Tarjeta de KPI estilo Stripe con sparkline.

**Props:**
- `title`: string - Título del KPI
- `value`: string | number - Valor principal
- `change?: number` - Variación porcentual
- `trend?: number[]` - Datos para sparkline
- `icon?: React.ReactNode` - Icono opcional
- `delay?: number` - Delay para animación

### ConversionFunnel
Gráfico de funnel de conversión horizontal.

**Props:**
- `data`: Array con stage, value y color

### QuotesEvolutionChart
Gráfico de líneas para evolución de presupuestos en el tiempo.

**Props:**
- `data`: Array con date, created, sent, accepted

### AcceptanceRatioChart
Gráfico de área para ratio de aceptación.

**Props:**
- `data`: Array con date y ratio

### AIInsights
Tarjetas de insights generados por IA.

**Props:**
- `insights`: Array con type, title, description

### ActivityFeed
Timeline de actividad estilo Stripe.

**Props:**
- `events`: Array de ActivityEvent con id, type, quoteTitle, clientName, timestamp, amount

### QuotesTable
Tabla profesional con filtros, ordenación y búsqueda.

**Props:**
- `quotes`: Array de QuoteRow con id, clientName, status, score, amount, date

## Ruta del Dashboard

El dashboard está disponible en `/app/dashboard` y se puede acceder con:

```
http://localhost:3000/app/dashboard
```

## Características

✅ Header ejecutivo con saludo dinámico y selector de rango
✅ KPIs estilo Stripe con sparklines
✅ Gráficos interactivos (Funnel, Evolución, Ratio)
✅ Insights IA generados automáticamente
✅ Activity feed en tiempo real
✅ Tabla profesional con filtros y búsqueda
✅ Diseño enterprise (Stripe/Linear)
✅ Animaciones suaves con Framer Motion
✅ Totalmente responsive

## Dependencias

- recharts - Gráficos
- framer-motion - Animaciones
- lucide-react - Iconos
- date-fns - Manejo de fechas

## Personalización

Los colores y estilos siguen la paleta de Tailwind CSS:
- Primary: blue-600
- Success: emerald-600
- Warning: amber-600
- Error: rose-600
- Neutral: slate-600

Para personalizar, modifica los colores en los componentes individuales.