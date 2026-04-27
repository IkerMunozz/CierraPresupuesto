CREATE TABLE "interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"negotiation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'chat' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text,
	"phone" text,
	"industry" text,
	"status" text DEFAULT 'prospecto' NOT NULL,
	"estimated_value" numeric(10, 2) DEFAULT '0.00',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" integer,
	"title" text NOT NULL,
	"status" text DEFAULT 'abierta' NOT NULL,
	"deal_value" numeric(12, 2) DEFAULT '0.00',
	"probability" integer DEFAULT 50,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"negotiation_id" integer,
	"type" text NOT NULL,
	"revenue" numeric(12, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lead_id" integer,
	"quote_id" integer,
	"type" text NOT NULL,
	"platform" text DEFAULT 'whatsapp',
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_events" ADD CONSTRAINT "sales_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_events" ADD CONSTRAINT "sales_events_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_messages" ADD CONSTRAINT "sales_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_messages" ADD CONSTRAINT "sales_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_messages" ADD CONSTRAINT "sales_messages_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;