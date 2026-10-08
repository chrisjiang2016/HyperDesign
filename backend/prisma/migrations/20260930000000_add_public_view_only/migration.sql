-- Add anonymous token-scoped preview; existing share types/default remain unchanged.
ALTER TABLE `ShareLink` MODIFY `accessType` ENUM('VIEW_ONLY', 'JOIN_TEAM', 'PUBLIC_VIEW_ONLY') NOT NULL DEFAULT 'VIEW_ONLY';
