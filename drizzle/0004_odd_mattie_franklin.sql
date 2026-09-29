CREATE TABLE `ai_connections` (
	`owner_user_id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'openai' NOT NULL,
	`auth_type` text DEFAULT 'chatgpt_device_oauth' NOT NULL,
	`credentials_encrypted` text NOT NULL,
	`external_account_id` text,
	`account_label` text,
	`status` text DEFAULT 'connected' NOT NULL,
	`token_expires_at` text,
	`connected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_used_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`role` text NOT NULL,
	`content_encrypted` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `ai_threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_messages_owner_thread_idx` ON `ai_messages` (`owner_user_id`,`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ai_pending_auth` (
	`owner_user_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`device_encrypted` text NOT NULL,
	`expires_at` text NOT NULL,
	`next_poll_at` text NOT NULL,
	`poll_lease_until` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`provider` text DEFAULT 'openai' NOT NULL,
	`model` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_threads_owner_updated_idx` ON `ai_threads` (`owner_user_id`,`updated_at`);