CREATE TABLE IF NOT EXISTS `user_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `title` varchar(500) NOT NULL,
  `titleArabic` varchar(500),
  `description` text,
  `descriptionArabic` text,
  `fileName` varchar(255) NOT NULL,
  `fileType` enum('pdf','doc','docx','txt','image') NOT NULL,
  `fileSize` int NOT NULL,
  `fileUrl` varchar(1000) NOT NULL,
  `fileKey` varchar(500) NOT NULL,
  `extractedContent` text,
  `extractedContentArabic` text,
  `category` enum('complaint','evidence','legal_document','report','correspondence','other') NOT NULL DEFAULT 'other',
  `tags` text,
  `isPrivate` boolean NOT NULL DEFAULT true,
  `sharedWith` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_documents_id` PRIMARY KEY(`id`)
);

CREATE INDEX `user_documents_userId_idx` ON `user_documents` (`userId`);
CREATE INDEX `user_documents_category_idx` ON `user_documents` (`category`);
