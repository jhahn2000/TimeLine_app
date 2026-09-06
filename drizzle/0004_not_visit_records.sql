CREATE TABLE `not_visit_records` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `timeline_record_id` integer NOT NULL,
  `trip_id` integer,
  `entry_date` text NOT NULL,
  `title` text NOT NULL,
  `note` text DEFAULT '' NOT NULL,
  `start_time` text NOT NULL,
  `end_time` text,
  `start_place` text,
  `start_lat` text,
  `start_lng` text,
  `source_id` text,
  `reason` text,
  `reason_detail` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `not_visit_records_timeline_record_id_unique` ON `not_visit_records` (`timeline_record_id`);
--> statement-breakpoint
CREATE INDEX `idx_not_visit_records_trip` ON `not_visit_records` (`trip_id`);
--> statement-breakpoint
CREATE INDEX `idx_not_visit_records_date` ON `not_visit_records` (`entry_date`);
