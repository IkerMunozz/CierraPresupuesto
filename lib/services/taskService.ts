// lib/services/taskService.ts
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { emitEvent, QUOTE_EVENT_TYPES } from '@/lib/db/events';

export interface CreateTaskParams {
  userId: string;
  clientId?: number;
  quoteId?: string;
  title: string;
  description?: string;
  dueDate?: Date;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  status?: 'pending' | 'completed';
  dueDate?: Date | null;
}

export interface TaskResult {
  success: boolean;
  taskId?: number;
  error?: string;
}

/**
 * Crear una tarea
 */
export async function createTask(params: CreateTaskParams): Promise<TaskResult> {
  try {
    const [task] = await db
      .insert(tasks)
      .values({
        userId: params.userId,
        clientId: params.clientId || null,
        quoteId: params.quoteId || null,
        title: params.title,
        description: params.description || null,
        dueDate: params.dueDate || null,
      })
      .returning({ id: tasks.id });

    // Emitir evento si está asociada a un presupuesto
    if (params.quoteId) {
      await emitEvent('TASK_CREATED', params.quoteId, {
        taskId: task.id,
        title: params.title,
      });
    }

    return { success: true, taskId: task.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Obtener tareas (con filtros opcionales)
 */
export async function getTasks(params: {
  userId: string;
  clientId?: number;
  quoteId?: string;
  status?: 'pending' | 'completed';
  limit?: number;
}) {
  const conditions = [eq(tasks.userId, params.userId)];

  if (params.clientId) conditions.push(eq(tasks.clientId, params.clientId));
  if (params.quoteId) conditions.push(eq(tasks.quoteId, params.quoteId));
  if (params.status) conditions.push(eq(tasks.status, params.status));

  const query = db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, params.userId))
    .orderBy(desc(tasks.dueDate), desc(tasks.createdAt));

  if (params.limit) query.limit(params.limit);

  return await query;
}

/**
 * Actualizar tarea
 */
export async function updateTask(
  taskId: number,
  userId: string,
  params: UpdateTaskParams
): Promise<boolean> {
  const result = await db
    .update(tasks)
    .set({
      ...params,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  return result.count > 0;
}

/**
 * Completar tarea (cambiar estado a 'completed')
 */
export async function completeTask(
  taskId: number,
  userId: string
): Promise<boolean> {
  const result = await db
    .update(tasks)
    .set({
      status: 'completed',
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  return result.count > 0;
}

/**
 * Eliminar tarea
 */
export async function deleteTask(taskId: number, userId: string): Promise<boolean> {
  const result = await db
    .delete(tasks)
    .where(eq(tasks.id, taskId));

  return result.count > 0;
}

/**
 * Obtener tareas pendientes para un usuario
 */
export async function getPendingTasks(userId: string, limit?: number) {
  return getTasks({ userId, status: 'pending', limit });
}

/**
 * Obtener tareas vencidas (fecha límite pasada y pendientes)
 */
export async function getOverdueTasks(userId: string) {
  const now = new Date();
  
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .where(eq(tasks.status, 'pending'))
    .where(tasks.dueDate < now)
    .orderBy(tasks.dueDate);
}
