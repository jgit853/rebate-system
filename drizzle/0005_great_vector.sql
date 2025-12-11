CREATE TABLE `login_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`dealerId` int,
	`loginType` enum('oauth','dealer') NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`loginTime` timestamp NOT NULL DEFAULT (now()),
	`success` boolean NOT NULL,
	`failReason` text,
	CONSTRAINT `login_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','disabled') DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX `user_idx` ON `login_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `dealer_idx` ON `login_logs` (`dealerId`);--> statement-breakpoint
CREATE INDEX `time_idx` ON `login_logs` (`loginTime`);