import { pgTable, text, integer, timestamp, jsonb, serial, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  password: text('password'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
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

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').primaryKey(),
  token: text('token').unique(),
  expires: timestamp('expires', { mode: 'date' }),
});

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  footerInfo: text('footer_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  taxId: text('tax_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const concepts = pgTable('concepts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  defaultPrice: decimal('default_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
  defaultIva: integer('default_iva').default(21).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  companyId: integer('company_id').references(() => companies.id),
  clientId: integer('client_id').references(() => clients.id),
  
  // Datos generales
  date: timestamp('date').defaultNow().notNull(),
  validUntil: timestamp('valid_until'),
  paymentMethod: text('payment_method'),
  internalNotes: text('internal_notes'),
  observations: text('observations'),
  status: text('status', { enum: ['borrador', 'enviado', 'aceptado', 'rechazado'] }).default('borrador').notNull(),
  
  // Legacy fields (kept for backward compatibility or AI generation)
  serviceType: text('service_type'),
  description: text('description'),
  price: text('price'),
  clientType: text('client_type'),
  context: text('context'),
  quote: text('quote'), // The full generated text
  analysis: jsonb('analysis'),
  improvedQuote: text('improved_quote'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quoteLines = pgTable('quote_lines', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id').references(() => quotes.id, { onDelete: 'cascade' }).notNull(),
  conceptId: integer('concept_id').references(() => concepts.id),
  name: text('name').notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 5, scale: 2 }).default('0.00').notNull(),
  iva: integer('iva').default(21).notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  quotes: many(quotes),
  companies: many(companies),
  clients: many(clients),
  concepts: many(concepts),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, { fields: [companies.userId], references: [users.id] }),
  quotes: many(quotes),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  quotes: many(quotes),
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
}));

export const quoteLinesRelations = relations(quoteLines, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLines.quoteId], references: [quotes.id] }),
  concept: one(concepts, { fields: [quoteLines.conceptId], references: [concepts.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
