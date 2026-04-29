// lib/services/noteService.ts
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export interface CreateNoteParams {
  userId: string;
  clientId?: number;
  quoteId?: string;
  title: string;
  content: string;
}

export interface UpdateNoteParams {
  title?: string;
  content?: string;
}

export interface NoteResult {
  success: boolean;
  noteId?: number;
  error?: string;
}

/**
 * Crear una nota
 */
export async function createNote(params: CreateNoteParams): Promise<NoteResult> {
  try {
    const [note] = await db
      .insert(notes)
      .values({
        userId: params.userId,
        clientId: params.clientId || null,
        quoteId: params.quoteId || null,
        title: params.title,
        content: params.content,
      })
      .returning({ id: notes.id });

    return { success: true, noteId: note.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Obtener notas (con filtros opcionales)
 */
export async function getNotes(params: {
  userId: string;
  clientId?: number;
  quoteId?: string;
  limit?: number;
}) {
  const conditions = [eq(notes.userId, params.userId)];

  if (params.clientId) conditions.push(eq(notes.clientId, params.clientId));
  if (params.quoteId) conditions.push(eq(notes.quoteId, params.quoteId));

  const query = db
    .select()
    .from(notes)
    .where(eq(notes.userId, params.userId))
    .orderBy(desc(notes.updatedAt));

  if (params.limit) query.limit(params.limit);

  return await query;
}

/**
 * Actualizar nota
 */
export async function updateNote(
  noteId: number,
  userId: string,
  params: UpdateNoteParams
): Promise<boolean> {
  const result = await db
    .update(notes)
    .set({
      ...params,
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  return result.count > 0;
}

/**
 * Eliminar nota
 */
export async function deleteNote(noteId: number, userId: string): Promise<boolean> {
  const result = await db
    .delete(notes)
    .where(eq(notes.id, noteId));

  return result.count > 0;
}
