CREATE TABLE `historical_complaints_by_category` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`categoryArabic` varchar(200),
	`categoryEnglish` varchar(200) NOT NULL,
	`complaintCount` int NOT NULL,
	`percentageOfTotal` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_complaints_by_category_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historical_complaints_by_entity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`entityNameArabic` varchar(300),
	`entityNameEnglish` varchar(300) NOT NULL,
	`complaintCount` int NOT NULL,
	`resolvedCount` int,
	`avgResolutionDays` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_complaints_by_entity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historical_convictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`entityNameArabic` varchar(300),
	`entityNameEnglish` varchar(300) NOT NULL,
	`position` varchar(200),
	`violationType` varchar(300) NOT NULL,
	`sentenceYears` int,
	`sentenceMonths` int,
	`fineOMR` int,
	`amountInvolved` int,
	`additionalPenalties` text,
	`summaryArabic` text,
	`summaryEnglish` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_convictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historical_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`metric` varchar(100) NOT NULL,
	`value` int,
	`valueDecimal` varchar(50),
	`unit` varchar(50) NOT NULL,
	`category` varchar(100),
	`source` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_stats_id` PRIMARY KEY(`id`)
);
