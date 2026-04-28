ALTER TABLE "companies" ADD COLUMN "logo" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "date" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "observations" text;