CREATE TABLE `status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`previousStatus` enum('new','under_review','investigating','resolved'),
	`newStatus` enum('new','under_review','investigating','resolved') NOT NULL,
	`changedByUserId` int NOT NULL,
	`changedByUserName` varchar(200),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekStartDate` timestamp NOT NULL,
	`weekEndDate` timestamp NOT NULL,
	`totalComplaints` int NOT NULL,
	`highRiskCount` int NOT NULL,
	`resolvedCount` int NOT NULL,
	`avgRiskScore` int NOT NULL,
	`categoryBreakdown` text NOT NULL,
	`topEntities` text NOT NULL,
	`recommendations` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`emailedTo` text,
	CONSTRAINT `weekly_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `status` enum('new','under_review','investigating','resolved') DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `assignedTo` int;--> statement-breakpoint
ALTER TABLE `conversations` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;