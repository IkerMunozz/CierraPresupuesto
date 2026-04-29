import { pgTable, text, integer, timestamp, jsonb, serial, decimal, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  password: text('password'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<'oauth' | 'email' | 'credentials'>(),
  provider: text('provider'),
  providerAccountId: text('provider_account_id'),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  sessionToken: text('session_token').unique(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan', { enum: ['free', 'pro', 'business'] })
    .default('free')
    .notNull(),
  status: text('status', { enum: ['active', 'canceled', 'past_due', 'trialing'] })
    .default('active')
    .notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: integer('cancel_at_period_end').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').primaryKey(),
  token: text('token').unique(),
  expires: timestamp('expires', { mode: 'date' }),
});

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  logo: text('logo'),
  footerInfo: text('footer_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  taxId: text('tax_id'),
  
  // Campos CRM profesional
  company: text('company'),
  sector: text('sector'),
  potentialValue: decimal('potential_value', { precision: 12, scale: 2 }).default('0.00'),
  status: text('status', { enum: ['lead', 'active', 'lost'] }).default('lead').notNull(),
  pipelineStage: text('pipeline_stage', { 
    enum: ['lead', 'contactado', 'propuesta', 'negociacion', 'ganado', 'perdido'] 
  }).default('lead'),
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  industry: text('industry'),
  status: text('status', { enum: ['prospecto', 'contactado', 'presupuestado', 'cerrado', 'perdido'] })
    .default('prospecto')
    .notNull(),
  estimatedValue: decimal('estimated_value', { precision: 10, scale: 2 }).default('0.00'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const salesMessages = pgTable('sales_messages', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  leadId: integer('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['prospeccion', 'seguimiento', 'objecion', 'cierre'] }).notNull(),
  platform: text('platform', { enum: ['whatsapp', 'email', 'linkedin'] }).default('whatsapp'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const negotiations = pgTable('negotiations', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  status: text('status', { enum: ['abierta', 'ganada', 'perdida', 'pausada'] }).default('abierta').notNull(),
  dealValue: decimal('deal_value', { precision: 12, scale: 2 }).default('0.00'),
  probability: integer('probability').default(50), // IA score 0-100
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const interactions = pgTable('interactions', {
  id: serial('id').primaryKey(),
  negotiationId: integer('negotiation_id').references(() => negotiations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['system', 'assistant', 'user', 'customer'] }).notNull(),
  content: text('content').notNull(),
  type: text('type', { enum: ['chat', 'proposal', 'follow_up', 'objection'] }).default('chat').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const salesEvents = pgTable('sales_events', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  negotiationId: integer('negotiation_id').references(() => negotiations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'deal_won', 'lead_captured', etc.
  revenue: decimal('revenue', { precision: 12, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const concepts = pgTable('concepts', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  defaultPrice: decimal('default_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
  defaultIva: integer('default_iva').default(21).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  clientName: text('client_name').notNull(),
  content: text('content'), // presupuesto generado
  analysis: jsonb('analysis'),
  improved: text('improved'),
  score: integer('score'),
  status: text('status', { enum: ['draft', 'sent', 'accepted', 'rejected'] })
    .default('draft')
    .notNull(),
  
  // Detalles del presupuesto
  date: timestamp('date').defaultNow().notNull(),
  validUntil: timestamp('valid_until'),
  paymentMethod: text('payment_method'),
  observations: text('observations'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Token para visualización pública
  viewToken: uuid('view_token').defaultRandom(),
  
  // Legacy fields (kept for metadata if needed)
  serviceType: text('service_type'),
  description: text('description'),
  price: text('price'),
  clientType: text('client_type'),
  context: text('context'),
  companyId: integer('company_id').references(() => companies.id),
  clientId: integer('client_id').references(() => clients.id),
});

export const quoteLines = pgTable('quote_lines', {
  id: serial('id').primaryKey(),
  quoteId: uuid('quote_id')
    .references(() => quotes.id, { onDelete: 'cascade' })
    .notNull(),
  conceptId: integer('concept_id').references(() => concepts.id),
  name: text('name').notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 5, scale: 2 }).default('0.00').notNull(),
  iva: integer('iva').default(21).notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
});

export const quoteEvents = pgTable('quote_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id')
    .references(() => quotes.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const emailTracking = pgTable('email_tracking', {
  id: uuid('id').defaultRandom().primaryKey(),
  emailId: text('email_id').unique(), // ID del email de Resend
  quoteId: uuid('quote_id')
    .references(() => quotes.id, { onDelete: 'cascade' })
    .notNull(),
  eventType: text('event_type').notNull(), // QUOTE_SENT, QUOTE_FOLLOWUP_SENT, etc.
  recipientEmail: text('recipient_email').notNull(),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  quotes: many(quotes),
  companies: many(companies),
  clients: many(clients),
  leads: many(leads),
  salesMessages: many(salesMessages),
  concepts: many(concepts),
  subscriptions: many(subscriptions),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  user: one(users, { fields: [leads.userId], references: [users.id] }),
  messages: many(salesMessages),
}));

export const salesMessagesRelations = relations(salesMessages, ({ one }) => ({
  user: one(users, { fields: [salesMessages.userId], references: [users.id] }),
  lead: one(leads, { fields: [salesMessages.leadId], references: [leads.id] }),
  quote: one(quotes, { fields: [salesMessages.quoteId], references: [quotes.id] }),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, { fields: [companies.userId], references: [users.id] }),
  quotes: many(quotes),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  quotes: many(quotes),
  quoteEvents: many(quoteEvents),
}));

export const conceptsRelations = relations(concepts, ({ one, many }) => ({
  user: one(users, { fields: [concepts.userId], references: [users.id] }),
  quoteLines: many(quoteLines),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  user: one(users, { fields: [quotes.userId], references: [users.id] }),
  company: one(companies, { fields: [quotes.companyId], references: [companies.id] }),
  client: one(clients, { fields: [quotes.clientId], references: [clients.id] }),
  lines: many(quoteLines),
  events: many(quoteEvents),
}));

export const quoteLinesRelations = relations(quoteLines, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLines.quoteId], references: [quotes.id] }),
  concept: one(concepts, { fields: [quoteLines.conceptId], references: [concepts.id] }),
}));

export const quoteEventsRelations = relations(quoteEvents, ({ one }) => ({
  quote: one(quotes, { fields: [quoteEvents.quoteId], references: [quotes.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionPlan = 'free' | 'pro' | 'business';

// ==================== NOTAS ====================

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== TAREAS ====================

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['pending', 'completed'] }).default('pending').notNull(),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== RELACIONES ====================

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
  client: one(clients, { fields: [notes.clientId], references: [clients.id] }),
  quote: one(quotes, { fields: [notes.quoteId], references: [quotes.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  client: one(clients, { fields: [tasks.clientId], references: [clients.id] }),
  quote: one(quotes, { fields: [tasks.quoteId], references: [quotes.id] }),
}));
