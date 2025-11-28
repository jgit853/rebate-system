CREATE TABLE `calculationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealerId` int NOT NULL,
	`currentPayment` int NOT NULL,
	`maxBudget` int,
	`customAmounts` text,
	`optimalTargetAmount` int,
	`optimalRebateAmount` int,
	`optimalMarketFund` int,
	`optimalTotalBenefit` int,
	`optimalTierName` varchar(100),
	`plansData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calculationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `dealer_idx` ON `calculationHistory` (`dealerId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `calculationHistory` (`createdAt`);