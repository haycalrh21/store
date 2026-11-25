CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer,
	"productName" text NOT NULL,
	"productImage" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderNumber" text NOT NULL,
	"userId" text,
	"customerName" text NOT NULL,
	"customerEmail" text NOT NULL,
	"customerPhone" text NOT NULL,
	"shippingAddress" text NOT NULL,
	"shippingNotes" text,
	"shippingCourier" text NOT NULL,
	"subtotal" integer NOT NULL,
	"shippingCost" integer DEFAULT 0 NOT NULL,
	"insuranceCost" integer DEFAULT 0 NOT NULL,
	"discountAmount" integer DEFAULT 0 NOT NULL,
	"grandTotal" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paymentMethod" text,
	"snapToken" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_orderNumber_unique" UNIQUE("orderNumber")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;