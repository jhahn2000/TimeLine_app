CREATE TABLE `favorite_places` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `address` text DEFAULT '' NOT NULL,
  `lat` text NOT NULL,
  `lng` text NOT NULL,
  `radius_meters` integer DEFAULT 15 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_favorite_places_coords` ON `favorite_places` (`lat`,`lng`);
--> statement-breakpoint
ALTER TABLE `timeline_records` ADD `place_name_source` text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE `timeline_records` ADD `confirmed_place_id` integer;
