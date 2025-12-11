CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` enum('info','warning','urgent') NOT NULL DEFAULT 'info',
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `help_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `help_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` enum('system','settlement','order','custom') NOT NULL DEFAULT 'system',
	`targetType` enum('all','role','user','dealer') NOT NULL,
	`targetId` int,
	`targetRole` enum('admin','user'),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `status_idx` ON `announcements` (`status`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `announcements` (`type`);--> statement-breakpoint
CREATE INDEX `published_at_idx` ON `announcements` (`publishedAt`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `help_docs` (`category`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `help_docs` (`status`);--> statement-breakpoint
CREATE INDEX `order_idx` ON `help_docs` (`order`);--> statement-breakpoint
CREATE INDEX `target_type_idx` ON `notifications` (`targetType`);--> statement-breakpoint
CREATE INDEX `target_id_idx` ON `notifications` (`targetId`);--> statement-breakpoint
CREATE INDEX `is_read_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `notifications` (`createdAt`);