CREATE TABLE `timeline_merge_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merge_token` text NOT NULL,
	`original_records` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`undone_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `timeline_merge_history_merge_token_unique` ON `timeline_merge_history` (`merge_token`);--> statement-breakpoint
CREATE TABLE `timeline_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_id` integer,
	`entry_date` text NOT NULL,
	`record_type` text NOT NULL,
	`title` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text,
	`transport_type` text,
	`original_transport_type` text,
	`distance_meters` integer,
	`start_place` text,
	`end_place` text,
	`start_lat` text,
	`start_lng` text,
	`end_lat` text,
	`end_lng` text,
	`source_id` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_timeline_records_date` ON `timeline_records` (`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_timeline_records_trip` ON `timeline_records` (`trip_id`);