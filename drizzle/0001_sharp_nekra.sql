CREATE TABLE `annual_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealerId` int NOT NULL,
	`periodId` int NOT NULL,
	`totalBaseUnit` int NOT NULL,
	`totalPaymentAmount` int NOT NULL,
	`overdueAmount` int NOT NULL,
	`overdueRatio` int NOT NULL,
	`baseRebateRate` int NOT NULL,
	`adjustedRebateRate` int NOT NULL,
	`rebateAmount` int NOT NULL,
	`totalCommissionAmount` int NOT NULL,
	`paidCommissionAmount` int NOT NULL,
	`marketFundAmount` int NOT NULL,
	`totalBenefitAmount` int NOT NULL,
	`benefitRatio` int NOT NULL,
	`status` enum('draft','pending_approval','approved','paid') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `annual_settlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `dealer_period_unique` UNIQUE(`dealerId`,`periodId`)
);
--> statement-breakpoint
CREATE TABLE `dealers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`parentDealerId` int,
	`type` enum('core','sub_dealer','terminal') NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`firstPaymentDate` date,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dealers_id` PRIMARY KEY(`id`),
	CONSTRAINT `dealers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `market_funds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealerId` int NOT NULL,
	`periodId` int NOT NULL,
	`type` enum('accrual','usage') NOT NULL,
	`amount` int NOT NULL,
	`description` text,
	`recordDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_funds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`price` int NOT NULL,
	`itemAmount` int NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(100) NOT NULL,
	`dealerId` int NOT NULL,
	`orderDate` date NOT NULL,
	`totalAmount` int NOT NULL,
	`status` enum('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
	`type` enum('normal','gift','special') NOT NULL DEFAULT 'normal',
	`dueDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`amount` int NOT NULL,
	`paymentDate` date NOT NULL,
	`method` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`spec` varchar(100) NOT NULL,
	`wholesalePrice` int NOT NULL,
	`baseUnit` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `settlement_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`type` enum('annual','quarterly','custom') NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `settlement_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sub_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coreDealerId` int NOT NULL,
	`subDealerId` int NOT NULL,
	`periodId` int NOT NULL,
	`commissionType` enum('first_year','renewal') NOT NULL,
	`paymentAmount` int NOT NULL,
	`baseUnit` int NOT NULL,
	`commissionRate` int NOT NULL,
	`commissionAmount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sub_commissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `core_sub_period_unique` UNIQUE(`coreDealerId`,`subDealerId`,`periodId`)
);
--> statement-breakpoint
CREATE INDEX `dealer_idx` ON `annual_settlements` (`dealerId`);--> statement-breakpoint
CREATE INDEX `period_idx` ON `annual_settlements` (`periodId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `annual_settlements` (`status`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `dealers` (`name`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `dealers` (`type`);--> statement-breakpoint
CREATE INDEX `parent_idx` ON `dealers` (`parentDealerId`);--> statement-breakpoint
CREATE INDEX `dealer_idx` ON `market_funds` (`dealerId`);--> statement-breakpoint
CREATE INDEX `period_idx` ON `market_funds` (`periodId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `market_funds` (`type`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `market_funds` (`recordDate`);--> statement-breakpoint
CREATE INDEX `order_idx` ON `order_items` (`orderId`);--> statement-breakpoint
CREATE INDEX `product_idx` ON `order_items` (`productId`);--> statement-breakpoint
CREATE INDEX `dealer_idx` ON `orders` (`dealerId`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `orders` (`orderDate`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `orders` (`type`);--> statement-breakpoint
CREATE INDEX `order_idx` ON `payments` (`orderId`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `payments` (`paymentDate`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `settlement_periods` (`type`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `settlement_periods` (`isActive`);--> statement-breakpoint
CREATE INDEX `core_idx` ON `sub_commissions` (`coreDealerId`);--> statement-breakpoint
CREATE INDEX `sub_idx` ON `sub_commissions` (`subDealerId`);--> statement-breakpoint
CREATE INDEX `period_idx` ON `sub_commissions` (`periodId`);