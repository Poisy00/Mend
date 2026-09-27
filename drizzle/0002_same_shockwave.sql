CREATE TABLE `rcc_preferences` (
	`owner_user_id` text PRIMARY KEY NOT NULL,
	`settings_encrypted` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
