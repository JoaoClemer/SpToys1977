CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE TABLE `product_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_photos_product_idx` ON `product_photos` (`product_id`,`position`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`original_price` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	CONSTRAINT "products_quantity_non_negative" CHECK("products"."quantity" >= 0),
	CONSTRAINT "products_price_non_negative" CHECK("products"."original_price" >= 0)
);
--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`customer_id` integer,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`sold_at` text NOT NULL,
	`buyer_name` text NOT NULL,
	`buyer_address` text,
	`buyer_phone` text,
	`delivery_method` text NOT NULL,
	`delivery_status` text DEFAULT 'pending' NOT NULL,
	`shipping_cost` integer,
	`tracking_code` text,
	`shipped_at` text,
	`delivered_at` text,
	`canceled_at` text,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sales_quantity_positive" CHECK("sales"."quantity" > 0),
	CONSTRAINT "sales_delivery_method_valid" CHECK("sales"."delivery_method" IN ('in_person','mail')),
	CONSTRAINT "sales_delivery_status_valid" CHECK("sales"."delivery_status" IN ('pending','shipped','delivered'))
);
--> statement-breakpoint
CREATE INDEX `sales_product_idx` ON `sales` (`product_id`);--> statement-breakpoint
CREATE INDEX `sales_sold_at_idx` ON `sales` (`sold_at`);--> statement-breakpoint
CREATE INDEX `sales_delivery_status_idx` ON `sales` (`delivery_status`);