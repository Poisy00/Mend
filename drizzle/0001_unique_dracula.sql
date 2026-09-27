CREATE TABLE `case_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_encrypted` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `case_events_owner_case_idx` ON `case_events` (`owner_user_id`,`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`human_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`customer_encrypted` text NOT NULL,
	`account_encrypted` text NOT NULL,
	`summary_encrypted` text NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`snapshot_encrypted` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cases_human_id_unique` ON `cases` (`human_id`);--> statement-breakpoint
CREATE INDEX `cases_owner_updated_idx` ON `cases` (`owner_user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `follow_up_drafts` (
	`owner_user_id` text PRIMARY KEY NOT NULL,
	`payload_encrypted` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rcc_drafts` (
	`owner_user_id` text NOT NULL,
	`workflow` text NOT NULL,
	`payload_encrypted` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rcc_drafts_owner_workflow_uq` ON `rcc_drafts` (`owner_user_id`,`workflow`);--> statement-breakpoint
CREATE TABLE `rcc_handoffs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`workflow` text NOT NULL,
	`snapshot_encrypted` text NOT NULL,
	`status` text DEFAULT 'prepared' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rcc_handoffs_owner_idx` ON `rcc_handoffs` (`owner_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `schedule_exceptions` (
	`owner_user_id` text NOT NULL,
	`cairo_date` text NOT NULL,
	`plan_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_exceptions_owner_date_uq` ON `schedule_exceptions` (`owner_user_id`,`cairo_date`);--> statement-breakpoint
CREATE TABLE `weekly_patterns` (
	`owner_user_id` text PRIMARY KEY NOT NULL,
	`pattern_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `callbacks` ADD `revision` integer DEFAULT 1 NOT NULL;