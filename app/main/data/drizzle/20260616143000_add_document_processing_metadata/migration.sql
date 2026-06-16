ALTER TABLE `documents` ADD `processing_started_at` integer;
--> statement-breakpoint
ALTER TABLE `documents` ADD `processing_completed_at` integer;
--> statement-breakpoint
ALTER TABLE `documents` ADD `processing_error` text;
--> statement-breakpoint
ALTER TABLE `documents` ADD `processor_version` text;
