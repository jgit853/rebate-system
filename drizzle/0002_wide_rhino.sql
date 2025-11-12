ALTER TABLE `dealers` ADD `username` varchar(100);--> statement-breakpoint
ALTER TABLE `dealers` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `dealers` ADD `passwordSetAt` timestamp;--> statement-breakpoint
ALTER TABLE `dealers` ADD `lastLoginAt` timestamp;--> statement-breakpoint
ALTER TABLE `dealers` ADD CONSTRAINT `dealers_username_unique` UNIQUE(`username`);