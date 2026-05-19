-- CreateTable: OttAdsPlan
CREATE TABLE "OttAdsPlan" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OttAdsPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OttAdsPlan_accountKey_key" ON "OttAdsPlan"("accountKey");

ALTER TABLE "OttAdsPlan" ADD CONSTRAINT "OttAdsPlan_accountKey_fkey"
  FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: OttAdsAd
CREATE TABLE "OttAdsAd" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT 'stackadapt',
    "period" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'new_request',
    "assignedToUserId" TEXT,
    "recurring" TEXT NOT NULL DEFAULT 'No',
    "flightStart" TEXT,
    "flightEnd" TEXT,
    "dueDate" TEXT,
    "completeDate" TEXT,
    "grossBudget" TEXT,
    "videoUrl" TEXT,
    "projectLink" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OttAdsAd_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OttAdsAd_planId_period_position_idx" ON "OttAdsAd"("planId", "period", "position");
CREATE INDEX "OttAdsAd_planId_position_idx" ON "OttAdsAd"("planId", "position");
CREATE INDEX "OttAdsAd_status_idx" ON "OttAdsAd"("status");
CREATE INDEX "OttAdsAd_assignedToUserId_idx" ON "OttAdsAd"("assignedToUserId");

ALTER TABLE "OttAdsAd" ADD CONSTRAINT "OttAdsAd_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "OttAdsPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OttAdsAd" ADD CONSTRAINT "OttAdsAd_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: OttAdsPerformance
CREATE TABLE "OttAdsPerformance" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "spend" TEXT,
    "impressions" TEXT,
    "completedViews" TEXT,
    "uniqueReach" TEXT,
    "footfallVisits" TEXT,
    "siteVisits" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OttAdsPerformance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OttAdsPerformance_adId_month_key" ON "OttAdsPerformance"("adId", "month");
CREATE INDEX "OttAdsPerformance_adId_month_idx" ON "OttAdsPerformance"("adId", "month");

ALTER TABLE "OttAdsPerformance" ADD CONSTRAINT "OttAdsPerformance_adId_fkey"
  FOREIGN KEY ("adId") REFERENCES "OttAdsAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: OttAdsGeoPerformance
CREATE TABLE "OttAdsGeoPerformance" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "impressions" TEXT,
    "spend" TEXT,
    "vcr" TEXT,
    "footfallVisits" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OttAdsGeoPerformance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OttAdsGeoPerformance_adId_month_idx" ON "OttAdsGeoPerformance"("adId", "month");

ALTER TABLE "OttAdsGeoPerformance" ADD CONSTRAINT "OttAdsGeoPerformance_adId_fkey"
  FOREIGN KEY ("adId") REFERENCES "OttAdsAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: OttAdsPropertyPerformance
CREATE TABLE "OttAdsPropertyPerformance" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "property" TEXT NOT NULL,
    "impressions" TEXT,
    "spend" TEXT,
    "vcr" TEXT,
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OttAdsPropertyPerformance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OttAdsPropertyPerformance_adId_month_rank_idx" ON "OttAdsPropertyPerformance"("adId", "month", "rank");

ALTER TABLE "OttAdsPropertyPerformance" ADD CONSTRAINT "OttAdsPropertyPerformance_adId_fkey"
  FOREIGN KEY ("adId") REFERENCES "OttAdsAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: OttAdsOptimization
CREATE TABLE "OttAdsOptimization" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "changeMade" TEXT NOT NULL,
    "reason" TEXT,
    "result" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OttAdsOptimization_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OttAdsOptimization_adId_date_idx" ON "OttAdsOptimization"("adId", "date");

ALTER TABLE "OttAdsOptimization" ADD CONSTRAINT "OttAdsOptimization_adId_fkey"
  FOREIGN KEY ("adId") REFERENCES "OttAdsAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OttAdsOptimization" ADD CONSTRAINT "OttAdsOptimization_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
