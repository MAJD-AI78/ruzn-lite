CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messages` text NOT NULL,
	`feature` enum('complaints','legislative') NOT NULL,
	`language` enum('arabic','english') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sample_complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`textArabic` text NOT NULL,
	`textEnglish` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`expectedRiskScore` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sample_complaints_id` PRIMARY KEY(`id`)
);
