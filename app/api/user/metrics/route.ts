import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { quotes, users } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Obtener todos los presupuestos del usuario
    const allQuotes = await db.query.quotes.findMany({
      where: eq(quotes.userId, userId),
    });

    // Calcular métricas reales
    const totalQuotes = allQuotes.length;
    
    // Presupuestos aceptados (status = 'accepted')
    const acceptedQuotes = allQuotes.filter(q => q.status === 'accepted').length;
    const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

    // Calcular ingresos totales (sumando total de líneas de presupuestos aceptados)
    let totalRevenue = 0;
    for (const quote of allQuotes) {
      if (quote.status === 'accepted' && quote.lines) {
        const quoteTotal = quote.lines.reduce((sum: number, line: any) => {
          return sum + parseFloat(line.totalAmount || 0);
        }, 0);
        totalRevenue += quoteTotal;
      }
    }

    // Formatear ingresos
    const formattedRevenue = totalRevenue >= 1000 
      ? `${(totalRevenue / 1000).toFixed(1)}k€` 
      : `${totalRevenue.toFixed(0)}€`;

    // Calcular ahorro de tiempo (estimado: 30 minutos por presupuesto)
    const timeSaved = totalQuotes * 0.5; // horas
    const formattedTimeSaved = timeSaved >= 1 
      ? `${timeSaved.toFixed(0)}h` 
      : `${Math.round(timeSaved * 60)}min`;

    // Calcular tendencia (comparar con mes anterior)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthQuotes = allQuotes.filter(q => {
      const quoteDate = new Date(q.createdAt);
      return quoteDate >= new Date(now.getFullYear(), now.getMonth(), 1);
    }).length;

    const lastMonthQuotes = allQuotes.filter(q => {
      const quoteDate = new Date(q.createdAt);
      return quoteDate >= lastMonth && quoteDate < new Date(now.getFullYear(), now.getMonth(), 1);
    }).length;

    const quoteTrend = lastMonthQuotes > 0 
      ? Math.round(((currentMonthQuotes - lastMonthQuotes) / lastMonthQuotes) * 100)
      : currentMonthQuotes > 0 ? 100 : 0;

    const trendSign = quoteTrend >= 0 ? '+' : '';

    return NextResponse.json({
      totalQuotes,
      conversionRate,
      totalRevenue: formattedRevenue,
      timeSaved: formattedTimeSaved,
      trends: {
        quotes: `${trendSign}${quoteTrend}%`,
        conversion: '+5%', // Placeholder - se podría calcular comparando conversión mensual
        revenue: '+15%', // Placeholder - se podría calcular comparando ingresos mensuales
        time: '+2h', // Placeholder
      }
    });
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { message: 'Error al obtener métricas', error: error.message },
      { status: 500 }
    );
  }
}