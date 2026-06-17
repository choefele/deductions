CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`original_file_name` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`sha256` text NOT NULL,
	`imported_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_sha256_unique` ON `documents` (`sha256`);--> statement-breakpoint
CREATE INDEX `documents_source_id_idx` ON `documents` (`source_id`);--> statement-breakpoint
CREATE INDEX `documents_imported_at_idx` ON `documents` (`imported_at`);--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`tax_year` integer NOT NULL,
	`category_id` text NOT NULL,
	`review_status` text NOT NULL,
	`deduction_reason` text,
	`note` text,
	`sort_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_id_idx` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `invoice_items_tax_year_idx` ON `invoice_items` (`tax_year`);--> statement-breakpoint
CREATE INDEX `invoice_items_tax_year_category_id_idx` ON `invoice_items` (`tax_year`,`category_id`);--> statement-breakpoint
CREATE INDEX `invoice_items_review_status_idx` ON `invoice_items` (`review_status`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text,
	`vendor` text NOT NULL,
	`invoice_date` text NOT NULL,
	`invoice_number` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_unique` ON `invoices` (`invoice_number`,`vendor`,`invoice_date`) WHERE "invoices"."invoice_number" is not null;--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_checked_at` integer,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sources_kind_idx` ON `sources` (`kind`);--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
