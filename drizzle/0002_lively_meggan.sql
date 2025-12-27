CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`eventType` enum('chat_message','complaint_analyzed','legislative_query','pdf_export','voice_input') NOT NULL,
	`feature` enum('complaints','legislative') NOT NULL,
	`language` enum('arabic','english') NOT NULL,
	`category` varchar(100),
	`riskScore` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleArabic` text NOT NULL,
	`titleEnglish` text NOT NULL,
	`descriptionArabic` text NOT NULL,
	`descriptionEnglish` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`severity` enum('critical','high','medium','low') NOT NULL,
	`ministry` varchar(200) NOT NULL,
	`year` int NOT NULL,
	`amountOMR` int,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demo_trends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`totalComplaints` int NOT NULL,
	`financialCorruption` int NOT NULL DEFAULT 0,
	`conflictOfInterest` int NOT NULL DEFAULT 0,
	`abuseOfPower` int NOT NULL DEFAULT 0,
	`tenderViolation` int NOT NULL DEFAULT 0,
	`adminNeglect` int NOT NULL DEFAULT 0,
	`generalComplaint` int NOT NULL DEFAULT 0,
	`avgRiskScore` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demo_trends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legislative_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleArabic` text NOT NULL,
	`titleEnglish` text NOT NULL,
	`documentType` enum('royal_decree','ministerial_decision','law','regulation','circular') NOT NULL,
	`documentNumber` varchar(100) NOT NULL,
	`year` int NOT NULL,
	`summaryArabic` text,
	`summaryEnglish` text,
	`keyProvisions` text,
	`relatedTo` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legislative_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `riskScore` int;--> statement-breakpoint
ALTER TABLE `conversations` ADD `category` varchar(100);--> statement-breakpoint
ALTER TABLE `sample_complaints` ADD `ministry` varchar(200);--> statement-breakpoint
ALTER TABLE `sample_complaints` ADD `keywords` text;