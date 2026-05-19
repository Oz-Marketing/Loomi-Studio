-- AlterTable
ALTER TABLE "MetaAdsPacerBudgetLog" DROP COLUMN "addedClientBudget",
DROP COLUMN "addedSpend",
DROP COLUMN "baseClientBudget",
DROP COLUMN "baseSpend",
ADD COLUMN     "adsSnapshot" TEXT NOT NULL DEFAULT '[]';
