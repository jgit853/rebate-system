CREATE TABLE `policy_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rebateTiers` text NOT NULL,
	`overdueDeductions` text NOT NULL,
	`benefitRedline` int NOT NULL,
	`marketFundRate` int NOT NULL,
	`firstYearCommissionRate` int NOT NULL,
	`renewalCommissionRate` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `policy_settings_id` PRIMARY KEY(`id`)
);
