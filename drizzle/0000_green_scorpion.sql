CREATE TABLE `auth_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`target_user_id` text,
	`event_type` text NOT NULL,
	`outcome` text NOT NULL,
	`origin_fingerprint` text,
	`metadata_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_audit_created_idx` ON `auth_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `auth_audit_target_idx` ON `auth_audit_log` (`target_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `callback_events` (
	`id` text PRIMARY KEY NOT NULL,
	`callback_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`previous_value_json` text,
	`new_value_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`callback_id`) REFERENCES `callbacks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `callback_events_callback_idx` ON `callback_events` (`callback_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `callback_events_owner_idx` ON `callback_events` (`owner_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `callbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`account_number` text NOT NULL,
	`phone_number` text NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`case_number` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`reason_code` text NOT NULL,
	`reason_details` text DEFAULT '' NOT NULL,
	`scheduled_at_utc` text NOT NULL,
	`source_timezone` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`voicemail_required` integer DEFAULT false NOT NULL,
	`voicemail_left` integer DEFAULT false NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`promise` text DEFAULT '' NOT NULL,
	`completion_condition` text DEFAULT '' NOT NULL,
	`appointment_start_utc` text,
	`appointment_end_utc` text,
	`completed_at` text,
	`closure_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `callbacks_owner_due_idx` ON `callbacks` (`owner_user_id`,`scheduled_at_utc`);--> statement-breakpoint
CREATE INDEX `callbacks_owner_status_idx` ON `callbacks` (`owner_user_id`,`status`);--> statement-breakpoint
CREATE TABLE `legacy_migrations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`migration_version` integer NOT NULL,
	`imported_callback_count` integer DEFAULT 0 NOT NULL,
	`imported_schedule_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `legacy_migrations_owner_key_uq` ON `legacy_migrations` (`owner_user_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `login_throttles` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`window_started_at` text NOT NULL,
	`blocked_until` text
);
--> statement-breakpoint
CREATE TABLE `schedule_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`weekly_schedule_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`block_type` text NOT NULL,
	`starts_at_local` text,
	`ends_at_local` text,
	`timezone` text DEFAULT 'Africa/Cairo' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`weekly_schedule_id`) REFERENCES `weekly_schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_blocks_schedule_idx` ON `schedule_blocks` (`weekly_schedule_id`,`day_of_week`);--> statement-breakpoint
CREATE INDEX `schedule_blocks_owner_idx` ON `schedule_blocks` (`owner_user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`user_agent_summary` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_uq` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `system_markers` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`primary_timezone` text DEFAULT 'Africa/Cairo' NOT NULL,
	`customer_timezone` text DEFAULT 'America/New_York' NOT NULL,
	`time_display_preference` text DEFAULT '12h' NOT NULL,
	`default_callback_duration` integer DEFAULT 15 NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`retention_days` integer DEFAULT 180 NOT NULL,
	`filters_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`username_normalized` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`failed_login_count` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`password_changed_at` text,
	`created_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_normalized_uq` ON `users` (`username_normalized`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE TABLE `weekly_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`week_start_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_schedules_owner_week_uq` ON `weekly_schedules` (`owner_user_id`,`week_start_date`);