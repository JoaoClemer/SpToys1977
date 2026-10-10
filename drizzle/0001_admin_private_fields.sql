CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `products` ADD `purchase_price` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `negotiation_limit_price` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `private_notes` text;