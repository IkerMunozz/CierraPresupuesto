ALTER TABLE "quote_lines" ALTER COLUMN "quote_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "sales_messages" ALTER COLUMN "quote_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "client_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "improved" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "valid_until";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "payment_method";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "internal_notes";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "observations";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "quote";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "improved_quote";