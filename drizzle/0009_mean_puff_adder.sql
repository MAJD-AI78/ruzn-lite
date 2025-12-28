CREATE TABLE `document_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`version` int NOT NULL,
	`changeType` enum('created','updated','restored') NOT NULL,
	`changeSummary` text,
	`previousContent` text,
	`changedBy` int,
	`changedByName` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD `sourceFileUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD `isLatest` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD `createdBy` int;