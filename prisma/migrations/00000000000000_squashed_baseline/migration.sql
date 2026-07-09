-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'client',
    "department" TEXT,
    "accountKeys" TEXT NOT NULL DEFAULT '[]',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardLayoutPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "orderJson" TEXT NOT NULL DEFAULT '[]',
    "hiddenJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardLayoutPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "slug" TEXT,
    "dealer" TEXT NOT NULL,
    "category" TEXT,
    "oem" TEXT,
    "oems" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "salesPhone" TEXT,
    "servicePhone" TEXT,
    "partsPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "website" TEXT,
    "timezone" TEXT,
    "logos" TEXT,
    "branding" TEXT,
    "customValues" TEXT,
    "markup" DOUBLE PRECISION,
    "senderEmail" TEXT,
    "senderName" TEXT,
    "sendingDomain" TEXT,
    "replyToEmail" TEXT,
    "sendgridApiKey" TEXT,
    "sendgridFromDomain" TEXT,
    "twilioAccountSid" TEXT,
    "twilioAuthToken" TEXT,
    "twilioPhoneNumber" TEXT,
    "twilioMessagingServiceSid" TEXT,
    "metaAdAccountId" TEXT,
    "facebookAdsMargin" DOUBLE PRECISION,
    "stackadaptAdvertiserId" TEXT,
    "stackadaptMargin" DOUBLE PRECISION,
    "googleAdsCustomerId" TEXT,
    "googleAdsMargin" DOUBLE PRECISION,
    "ghlApiKey" TEXT,
    "ghlLocationId" TEXT,
    "metaTimezone" TEXT,
    "accountRepId" TEXT,
    "lifecyclePresetsSeededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "accountKey" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "preheader" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateTagAssignment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TemplateTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountEmail" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "archivedAt" TIMESTAMP(3),
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audience" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountKey" TEXT,
    "createdByUserId" TEXT,
    "filters" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "providerMetadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "address1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "source" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "dateAdded" TIMESTAMP(3),
    "vehicleYear" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleVin" TEXT,
    "vehicleMileage" TEXT,
    "lastServiceDate" TIMESTAMP(3),
    "nextServiceDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3),
    "customFields" JSONB,
    "dnd" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountKey" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactListMembership" (
    "listId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactListMembership_pkey" PRIMARY KEY ("listId","contactId")
);

-- CreateTable
CREATE TABLE "ContactCustomField" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "category" TEXT,
    "isPii" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentBlueprintId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "industryTag" TEXT,
    "csvAliases" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomiFlow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "accountKey" TEXT,
    "createdByUserId" TEXT,
    "sourceAudienceId" TEXT,
    "sourceFilter" TEXT,
    "metadata" TEXT,
    "parentTemplateId" TEXT,
    "settings" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomiFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomiFlowNode" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomiFlowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomiFlowEdge" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "branch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoomiFlowEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomiFlowTrigger" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomiFlowTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomiFlowEnrollment" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "triggerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentNodeId" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomiFlowEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomiFlowEnrollmentStep" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "emailRecipientId" TEXT,
    "branch" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "LoomiFlowEnrollmentStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "schema" JSONB NOT NULL,
    "redirectUrl" TEXT,
    "successMessage" TEXT,
    "listId" TEXT,
    "forwardToCrm" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "contactId" TEXT,
    "data" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "lpId" TEXT,
    "lpSlug" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDestination" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "leadEmail" TEXT NOT NULL DEFAULT '[]',
    "accessToken" TEXT,
    "portalId" TEXT,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDelivery" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'form',
    "submissionId" TEXT,
    "contactId" TEXT,
    "recipientEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "messageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "CrmDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT,
    "name" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "schema" JSONB NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "faviconUrl" TEXT,
    "metaPixelId" TEXT,
    "ga4MeasurementId" TEXT,
    "gtmContainerId" TEXT,
    "customHeadHtml" TEXT,
    "customBodyEndHtml" TEXT,
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSnippet" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'generic',
    "schema" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSnippet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDomain" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "homeLandingPageId" TEXT,
    "cloudflareCustomHostnameId" TEXT,
    "cloudflareSslStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountLandingPageTemplate" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "sourceLpId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountLandingPageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageEvent" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessionId" TEXT,
    "anonId" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "flowNodeKey" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdByRole" TEXT,
    "sourceAudienceId" TEXT,
    "sourceFilter" TEXT,
    "sourceListId" TEXT,
    "sourceContactIds" TEXT,
    "accountKeys" TEXT NOT NULL DEFAULT '[]',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "error" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "phone" TEXT,
    "fullName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "messageId" TEXT,
    "conversationId" TEXT,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "recipientId" TEXT,
    "accountKey" TEXT,
    "eventType" TEXT NOT NULL,
    "twilioMessageSid" TEXT,
    "from" TEXT,
    "to" TEXT,
    "body" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "raw" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsSuppression" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'twilio',
    "raw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "flowNodeKey" TEXT,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'template-library',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdByRole" TEXT,
    "sourceAudienceId" TEXT,
    "sourceFilter" TEXT,
    "sourceListId" TEXT,
    "sourceContactIds" TEXT,
    "accountKeys" TEXT NOT NULL DEFAULT '[]',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "error" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "recipientId" TEXT,
    "accountKey" TEXT,
    "eventType" TEXT NOT NULL,
    "sgEventId" TEXT NOT NULL,
    "sgMessageId" TEXT,
    "email" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "url" TEXT,
    "reason" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "raw" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'sendgrid',
    "raw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'improvement',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangelogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT,
    "s3Key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailKey" TEXT,
    "altText" TEXT,
    "category" TEXT,
    "tags" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerPlan" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "baseBudgetGoal" TEXT,
    "addedBudgetGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAdsPacerPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerAuditEntry" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "adId" TEXT,
    "adName" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "fromValue" TEXT,
    "toValue" TEXT,
    "summary" TEXT NOT NULL,
    "groupId" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAdsPacerAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerMonthSnapshot" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frozenByUserId" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedByUserId" TEXT,

    CONSTRAINT "MetaAdsPacerMonthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerPeriodBudget" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "baseBudgetGoal" TEXT,
    "addedBudgetGoal" TEXT,
    "baseCarryover" TEXT,
    "addedCarryover" TEXT,
    "historicalActual" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAdsPacerPeriodBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerCarryoverApplication" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "sourceMonth" TEXT NOT NULL,
    "targetMonth" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "appliedByUserId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAdsPacerCarryoverApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerAd" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL DEFAULT '',
    "ownerUserId" TEXT,
    "designerUserId" TEXT,
    "accountRepUserId" TEXT,
    "period" TEXT NOT NULL DEFAULT '',
    "month" TEXT,
    "actionNeeded" TEXT,
    "recurring" TEXT NOT NULL DEFAULT 'No',
    "coop" TEXT NOT NULL DEFAULT 'No',
    "budgetType" TEXT NOT NULL DEFAULT 'Daily',
    "budgetSource" TEXT NOT NULL DEFAULT 'base',
    "splitBaseAmount" TEXT,
    "flightStart" TEXT,
    "flightEnd" TEXT,
    "liveDate" TEXT,
    "creativeDueDate" TEXT,
    "dueDate" TEXT,
    "dateCompleted" TEXT,
    "adStatus" TEXT NOT NULL DEFAULT 'In Draft',
    "designStatus" TEXT NOT NULL DEFAULT 'Not Started',
    "internalApproval" TEXT NOT NULL DEFAULT 'Pending Approval',
    "clientApproval" TEXT NOT NULL DEFAULT 'Pending Approval',
    "allocation" TEXT,
    "pacerActual" TEXT,
    "pacerDailyBudget" TEXT,
    "pacerRunSpend" TEXT,
    "fullRunAppliedToMonth" TEXT,
    "lifetimeMonthSplit" TEXT,
    "pacerTodayDate" TEXT,
    "pacerEndDate" TEXT,
    "metaObjectType" TEXT,
    "metaObjectId" TEXT,
    "metaEffectiveStatus" TEXT,
    "pacerSyncedAt" TIMESTAMP(3),
    "metaStartDate" TEXT,
    "metaEndDate" TEXT,
    "platform" TEXT,
    "googleCampaignId" TEXT,
    "googleChannelType" TEXT,
    "googleEffectiveStatus" TEXT,
    "googleStartDate" TEXT,
    "googleEndDate" TEXT,
    "googleBudgetResourceName" TEXT,
    "alertsMuted" BOOLEAN NOT NULL DEFAULT false,
    "creativeLink" TEXT,
    "clientName" TEXT,
    "digitalDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAdsPacerAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerDesignNote" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAdsPacerDesignNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerActivityLog" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attachmentKey" TEXT,
    "attachmentFilename" TEXT,
    "attachmentMimeType" TEXT,
    "attachmentSize" INTEGER,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAdsPacerActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerAccountNote" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "period" TEXT,
    "text" TEXT NOT NULL,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAdsPacerAccountNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsPacerBudgetLog" (
    "id" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "adsSnapshot" TEXT NOT NULL DEFAULT '[]',
    "note" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAdsPacerBudgetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "metaJson" TEXT,
    "emailedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'meta',
    "metric" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "baselineType" TEXT NOT NULL,
    "baselineParams" TEXT NOT NULL DEFAULT '{}',
    "fireCondition" TEXT NOT NULL DEFAULT '{}',
    "tier" TEXT NOT NULL DEFAULT 'FYI',
    "minVolumeGate" DOUBLE PRECISION,
    "cooldownHours" INTEGER NOT NULL DEFAULT 20,
    "phase" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "UserInvite_userId_createdAt_idx" ON "UserInvite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "DashboardLayoutPreference_userId_updatedAt_idx" ON "DashboardLayoutPreference"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardLayoutPreference_userId_role_mode_scopeKey_key" ON "DashboardLayoutPreference"("userId", "role", "mode", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Account_key_key" ON "Account"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Account_slug_key" ON "Account"("slug");

-- CreateIndex
CREATE INDEX "Account_accountRepId_idx" ON "Account"("accountRepId");

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "Template_published_idx" ON "Template"("published");

-- CreateIndex
CREATE INDEX "Template_accountKey_idx" ON "Template"("accountKey");

-- CreateIndex
CREATE INDEX "TemplateVersion_templateId_idx" ON "TemplateVersion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateTag_name_key" ON "TemplateTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateTagAssignment_templateId_tagId_key" ON "TemplateTagAssignment"("templateId", "tagId");

-- CreateIndex
CREATE INDEX "AccountEmail_accountKey_idx" ON "AccountEmail"("accountKey");

-- CreateIndex
CREATE INDEX "AccountEmail_templateId_idx" ON "AccountEmail"("templateId");

-- CreateIndex
CREATE INDEX "AccountEmail_status_archivedAt_idx" ON "AccountEmail"("status", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailFolder_name_accountKey_key" ON "EmailFolder"("name", "accountKey");

-- CreateIndex
CREATE INDEX "Audience_accountKey_idx" ON "Audience"("accountKey");

-- CreateIndex
CREATE UNIQUE INDEX "Audience_name_accountKey_key" ON "Audience"("name", "accountKey");

-- CreateIndex
CREATE INDEX "Contact_accountKey_idx" ON "Contact"("accountKey");

-- CreateIndex
CREATE INDEX "Contact_accountKey_dateAdded_idx" ON "Contact"("accountKey", "dateAdded");

-- CreateIndex
CREATE INDEX "Contact_accountKey_id_idx" ON "Contact"("accountKey", "id");

-- CreateIndex
CREATE INDEX "Contact_accountKey_dateOfBirth_idx" ON "Contact"("accountKey", "dateOfBirth");

-- CreateIndex
CREATE INDEX "Contact_customFields_idx" ON "Contact" USING GIN ("customFields" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_accountKey_email_key" ON "Contact"("accountKey", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_accountKey_phone_key" ON "Contact"("accountKey", "phone");

-- CreateIndex
CREATE INDEX "ContactList_accountKey_idx" ON "ContactList"("accountKey");

-- CreateIndex
CREATE UNIQUE INDEX "ContactList_accountKey_name_key" ON "ContactList"("accountKey", "name");

-- CreateIndex
CREATE INDEX "ContactListMembership_listId_idx" ON "ContactListMembership"("listId");

-- CreateIndex
CREATE INDEX "ContactListMembership_contactId_idx" ON "ContactListMembership"("contactId");

-- CreateIndex
CREATE INDEX "ContactCustomField_accountKey_idx" ON "ContactCustomField"("accountKey");

-- CreateIndex
CREATE INDEX "ContactCustomField_parentBlueprintId_idx" ON "ContactCustomField"("parentBlueprintId");

-- CreateIndex
CREATE INDEX "ContactCustomField_industryTag_idx" ON "ContactCustomField"("industryTag");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCustomField_accountKey_key_key" ON "ContactCustomField"("accountKey", "key");

-- CreateIndex
CREATE INDEX "LoomiFlow_accountKey_idx" ON "LoomiFlow"("accountKey");

-- CreateIndex
CREATE INDEX "LoomiFlow_status_idx" ON "LoomiFlow"("status");

-- CreateIndex
CREATE INDEX "LoomiFlow_createdAt_idx" ON "LoomiFlow"("createdAt");

-- CreateIndex
CREATE INDEX "LoomiFlow_parentTemplateId_idx" ON "LoomiFlow"("parentTemplateId");

-- CreateIndex
CREATE INDEX "LoomiFlow_status_archivedAt_idx" ON "LoomiFlow"("status", "archivedAt");

-- CreateIndex
CREATE INDEX "LoomiFlowNode_flowId_idx" ON "LoomiFlowNode"("flowId");

-- CreateIndex
CREATE INDEX "LoomiFlowEdge_flowId_idx" ON "LoomiFlowEdge"("flowId");

-- CreateIndex
CREATE INDEX "LoomiFlowEdge_fromNodeId_idx" ON "LoomiFlowEdge"("fromNodeId");

-- CreateIndex
CREATE INDEX "LoomiFlowTrigger_flowId_idx" ON "LoomiFlowTrigger"("flowId");

-- CreateIndex
CREATE INDEX "LoomiFlowTrigger_type_enabled_idx" ON "LoomiFlowTrigger"("type", "enabled");

-- CreateIndex
CREATE INDEX "LoomiFlowEnrollment_status_nextRunAt_idx" ON "LoomiFlowEnrollment"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "LoomiFlowEnrollment_flowId_status_idx" ON "LoomiFlowEnrollment"("flowId", "status");

-- CreateIndex
CREATE INDEX "LoomiFlowEnrollment_contactId_idx" ON "LoomiFlowEnrollment"("contactId");

-- CreateIndex
CREATE INDEX "LoomiFlowEnrollment_flowId_enrolledAt_idx" ON "LoomiFlowEnrollment"("flowId", "enrolledAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoomiFlowEnrollment_flowId_contactId_key" ON "LoomiFlowEnrollment"("flowId", "contactId");

-- CreateIndex
CREATE INDEX "LoomiFlowEnrollmentStep_enrollmentId_idx" ON "LoomiFlowEnrollmentStep"("enrollmentId");

-- CreateIndex
CREATE INDEX "LoomiFlowEnrollmentStep_nodeId_idx" ON "LoomiFlowEnrollmentStep"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Form_slug_key" ON "Form"("slug");

-- CreateIndex
CREATE INDEX "Form_accountKey_idx" ON "Form"("accountKey");

-- CreateIndex
CREATE INDEX "Form_accountKey_status_idx" ON "Form"("accountKey", "status");

-- CreateIndex
CREATE INDEX "Form_accountKey_isTemplate_idx" ON "Form"("accountKey", "isTemplate");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_createdAt_idx" ON "FormSubmission"("formId", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_contactId_idx" ON "FormSubmission"("contactId");

-- CreateIndex
CREATE INDEX "FormSubmission_lpId_createdAt_idx" ON "FormSubmission"("lpId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmDestination_accountKey_enabled_idx" ON "CrmDestination"("accountKey", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "CrmDestination_accountKey_provider_key" ON "CrmDestination"("accountKey", "provider");

-- CreateIndex
CREATE INDEX "CrmDelivery_destinationId_createdAt_idx" ON "CrmDelivery"("destinationId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmDelivery_submissionId_idx" ON "CrmDelivery"("submissionId");

-- CreateIndex
CREATE INDEX "CrmDelivery_contactId_idx" ON "CrmDelivery"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "LandingPage"("slug");

-- CreateIndex
CREATE INDEX "LandingPage_accountKey_idx" ON "LandingPage"("accountKey");

-- CreateIndex
CREATE INDEX "LandingPage_accountKey_status_idx" ON "LandingPage"("accountKey", "status");

-- CreateIndex
CREATE INDEX "LandingPage_accountKey_isTemplate_idx" ON "LandingPage"("accountKey", "isTemplate");

-- CreateIndex
CREATE INDEX "AccountSnippet_accountKey_idx" ON "AccountSnippet"("accountKey");

-- CreateIndex
CREATE INDEX "AccountSnippet_accountKey_kind_idx" ON "AccountSnippet"("accountKey", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "AccountDomain_hostname_key" ON "AccountDomain"("hostname");

-- CreateIndex
CREATE INDEX "AccountDomain_accountKey_idx" ON "AccountDomain"("accountKey");

-- CreateIndex
CREATE INDEX "AccountLandingPageTemplate_accountKey_createdAt_idx" ON "AccountLandingPageTemplate"("accountKey", "createdAt");

-- CreateIndex
CREATE INDEX "LandingPageEvent_pageId_createdAt_idx" ON "LandingPageEvent"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "LandingPageEvent_pageId_type_createdAt_idx" ON "LandingPageEvent"("pageId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "LandingPageEvent_slug_createdAt_idx" ON "LandingPageEvent"("slug", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsCampaign_flowNodeKey_key" ON "SmsCampaign"("flowNodeKey");

-- CreateIndex
CREATE INDEX "SmsCampaign_status_scheduledFor_idx" ON "SmsCampaign"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SmsCampaign_createdAt_idx" ON "SmsCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "SmsCampaign_archivedAt_idx" ON "SmsCampaign"("archivedAt");

-- CreateIndex
CREATE INDEX "SmsCampaignRecipient_campaignId_status_idx" ON "SmsCampaignRecipient"("campaignId", "status");

-- CreateIndex
CREATE INDEX "SmsCampaignRecipient_accountKey_status_idx" ON "SmsCampaignRecipient"("accountKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SmsCampaignRecipient_campaignId_contactId_accountKey_key" ON "SmsCampaignRecipient"("campaignId", "contactId", "accountKey");

-- CreateIndex
CREATE INDEX "SmsEvent_campaignId_eventType_idx" ON "SmsEvent"("campaignId", "eventType");

-- CreateIndex
CREATE INDEX "SmsEvent_recipientId_idx" ON "SmsEvent"("recipientId");

-- CreateIndex
CREATE INDEX "SmsEvent_accountKey_eventType_idx" ON "SmsEvent"("accountKey", "eventType");

-- CreateIndex
CREATE INDEX "SmsEvent_twilioMessageSid_idx" ON "SmsEvent"("twilioMessageSid");

-- CreateIndex
CREATE INDEX "SmsEvent_timestamp_idx" ON "SmsEvent"("timestamp");

-- CreateIndex
CREATE INDEX "SmsSuppression_phone_idx" ON "SmsSuppression"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "SmsSuppression_accountKey_phone_key" ON "SmsSuppression"("accountKey", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCampaign_flowNodeKey_key" ON "EmailCampaign"("flowNodeKey");

-- CreateIndex
CREATE INDEX "EmailCampaign_status_scheduledFor_idx" ON "EmailCampaign"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "EmailCampaign_createdAt_idx" ON "EmailCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "EmailCampaign_archivedAt_idx" ON "EmailCampaign"("archivedAt");

-- CreateIndex
CREATE INDEX "EmailCampaignRecipient_campaignId_status_idx" ON "EmailCampaignRecipient"("campaignId", "status");

-- CreateIndex
CREATE INDEX "EmailCampaignRecipient_accountKey_status_idx" ON "EmailCampaignRecipient"("accountKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCampaignRecipient_campaignId_contactId_accountKey_key" ON "EmailCampaignRecipient"("campaignId", "contactId", "accountKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailEvent_sgEventId_key" ON "EmailEvent"("sgEventId");

-- CreateIndex
CREATE INDEX "EmailEvent_campaignId_eventType_idx" ON "EmailEvent"("campaignId", "eventType");

-- CreateIndex
CREATE INDEX "EmailEvent_recipientId_idx" ON "EmailEvent"("recipientId");

-- CreateIndex
CREATE INDEX "EmailEvent_accountKey_eventType_idx" ON "EmailEvent"("accountKey", "eventType");

-- CreateIndex
CREATE INDEX "EmailEvent_sgMessageId_idx" ON "EmailEvent"("sgMessageId");

-- CreateIndex
CREATE INDEX "EmailEvent_timestamp_idx" ON "EmailEvent"("timestamp");

-- CreateIndex
CREATE INDEX "EmailSuppression_email_idx" ON "EmailSuppression"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_accountKey_email_key" ON "EmailSuppression"("accountKey", "email");

-- CreateIndex
CREATE INDEX "ChangelogEntry_publishedAt_idx" ON "ChangelogEntry"("publishedAt");

-- CreateIndex
CREATE INDEX "MediaAsset_accountKey_createdAt_idx" ON "MediaAsset"("accountKey", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_accountKey_category_idx" ON "MediaAsset"("accountKey", "category");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_s3Key_key" ON "MediaAsset"("s3Key");

-- CreateIndex
CREATE UNIQUE INDEX "MetaAdsPacerPlan_accountKey_key" ON "MetaAdsPacerPlan"("accountKey");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAuditEntry_accountKey_period_createdAt_idx" ON "MetaAdsPacerAuditEntry"("accountKey", "period", "createdAt");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAuditEntry_adId_createdAt_idx" ON "MetaAdsPacerAuditEntry"("adId", "createdAt");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAuditEntry_createdAt_idx" ON "MetaAdsPacerAuditEntry"("createdAt");

-- CreateIndex
CREATE INDEX "MetaAdsPacerMonthSnapshot_planId_idx" ON "MetaAdsPacerMonthSnapshot"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaAdsPacerMonthSnapshot_planId_period_key" ON "MetaAdsPacerMonthSnapshot"("planId", "period");

-- CreateIndex
CREATE INDEX "MetaAdsPacerPeriodBudget_planId_period_idx" ON "MetaAdsPacerPeriodBudget"("planId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MetaAdsPacerPeriodBudget_planId_period_key" ON "MetaAdsPacerPeriodBudget"("planId", "period");

-- CreateIndex
CREATE INDEX "MetaAdsPacerCarryoverApplication_planId_sourceMonth_idx" ON "MetaAdsPacerCarryoverApplication"("planId", "sourceMonth");

-- CreateIndex
CREATE INDEX "MetaAdsPacerCarryoverApplication_planId_targetMonth_idx" ON "MetaAdsPacerCarryoverApplication"("planId", "targetMonth");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAd_planId_period_position_idx" ON "MetaAdsPacerAd"("planId", "period", "position");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAd_planId_position_idx" ON "MetaAdsPacerAd"("planId", "position");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAd_adStatus_idx" ON "MetaAdsPacerAd"("adStatus");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAd_designerUserId_idx" ON "MetaAdsPacerAd"("designerUserId");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAd_ownerUserId_idx" ON "MetaAdsPacerAd"("ownerUserId");

-- CreateIndex
CREATE INDEX "MetaAdsPacerDesignNote_adId_createdAt_idx" ON "MetaAdsPacerDesignNote"("adId", "createdAt");

-- CreateIndex
CREATE INDEX "MetaAdsPacerActivityLog_adId_createdAt_idx" ON "MetaAdsPacerActivityLog"("adId", "createdAt");

-- CreateIndex
CREATE INDEX "MetaAdsPacerAccountNote_accountKey_period_createdAt_idx" ON "MetaAdsPacerAccountNote"("accountKey", "period", "createdAt");

-- CreateIndex
CREATE INDEX "MetaAdsPacerBudgetLog_accountKey_period_createdAt_idx" ON "MetaAdsPacerBudgetLog"("accountKey", "period", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AlertRule_key_key" ON "AlertRule"("key");

-- CreateIndex
CREATE INDEX "AlertRule_enabled_idx" ON "AlertRule"("enabled");

-- CreateIndex
CREATE INDEX "AlertRule_channel_enabled_idx" ON "AlertRule"("channel", "enabled");

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardLayoutPreference" ADD CONSTRAINT "DashboardLayoutPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_accountRepId_fkey" FOREIGN KEY ("accountRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTagAssignment" ADD CONSTRAINT "TemplateTagAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTagAssignment" ADD CONSTRAINT "TemplateTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "TemplateTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEmail" ADD CONSTRAINT "AccountEmail_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEmail" ADD CONSTRAINT "AccountEmail_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEmail" ADD CONSTRAINT "AccountEmail_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "EmailFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audience" ADD CONSTRAINT "Audience_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactList" ADD CONSTRAINT "ContactList_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactListMembership" ADD CONSTRAINT "ContactListMembership_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactListMembership" ADD CONSTRAINT "ContactListMembership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCustomField" ADD CONSTRAINT "ContactCustomField_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCustomField" ADD CONSTRAINT "ContactCustomField_parentBlueprintId_fkey" FOREIGN KEY ("parentBlueprintId") REFERENCES "ContactCustomField"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomiFlow" ADD CONSTRAINT "LoomiFlow_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomiFlow" ADD CONSTRAINT "LoomiFlow_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "LoomiFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomiFlowNode" ADD CONSTRAINT "LoomiFlowNode_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "LoomiFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomiFlowEdge" ADD CONSTRAINT "LoomiFlowEdge_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "LoomiFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomiFlowTrigger" ADD CONSTRAINT "LoomiFlowTrigger_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "LoomiFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomiFlowEnrollment" ADD CONSTRAINT "LoomiFlowEnrollment_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "LoomiFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomiFlowEnrollmentStep" ADD CONSTRAINT "LoomiFlowEnrollmentStep_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LoomiFlowEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ContactList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_lpId_fkey" FOREIGN KEY ("lpId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDestination" ADD CONSTRAINT "CrmDestination_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDelivery" ADD CONSTRAINT "CrmDelivery_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSnippet" ADD CONSTRAINT "AccountSnippet_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDomain" ADD CONSTRAINT "AccountDomain_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDomain" ADD CONSTRAINT "AccountDomain_homeLandingPageId_fkey" FOREIGN KEY ("homeLandingPageId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountLandingPageTemplate" ADD CONSTRAINT "AccountLandingPageTemplate_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageEvent" ADD CONSTRAINT "LandingPageEvent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCampaignRecipient" ADD CONSTRAINT "SmsCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SmsCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsEvent" ADD CONSTRAINT "SmsEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "SmsCampaignRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "EmailCampaignRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerPlan" ADD CONSTRAINT "MetaAdsPacerPlan_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerAuditEntry" ADD CONSTRAINT "MetaAdsPacerAuditEntry_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MetaAdsPacerPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerMonthSnapshot" ADD CONSTRAINT "MetaAdsPacerMonthSnapshot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MetaAdsPacerPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerPeriodBudget" ADD CONSTRAINT "MetaAdsPacerPeriodBudget_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MetaAdsPacerPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerCarryoverApplication" ADD CONSTRAINT "MetaAdsPacerCarryoverApplication_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MetaAdsPacerPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerAd" ADD CONSTRAINT "MetaAdsPacerAd_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MetaAdsPacerPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerAd" ADD CONSTRAINT "MetaAdsPacerAd_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerAd" ADD CONSTRAINT "MetaAdsPacerAd_designerUserId_fkey" FOREIGN KEY ("designerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerAd" ADD CONSTRAINT "MetaAdsPacerAd_accountRepUserId_fkey" FOREIGN KEY ("accountRepUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerDesignNote" ADD CONSTRAINT "MetaAdsPacerDesignNote_adId_fkey" FOREIGN KEY ("adId") REFERENCES "MetaAdsPacerAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerDesignNote" ADD CONSTRAINT "MetaAdsPacerDesignNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerActivityLog" ADD CONSTRAINT "MetaAdsPacerActivityLog_adId_fkey" FOREIGN KEY ("adId") REFERENCES "MetaAdsPacerAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerActivityLog" ADD CONSTRAINT "MetaAdsPacerActivityLog_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerAccountNote" ADD CONSTRAINT "MetaAdsPacerAccountNote_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerAccountNote" ADD CONSTRAINT "MetaAdsPacerAccountNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerBudgetLog" ADD CONSTRAINT "MetaAdsPacerBudgetLog_accountKey_fkey" FOREIGN KEY ("accountKey") REFERENCES "Account"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAdsPacerBudgetLog" ADD CONSTRAINT "MetaAdsPacerBudgetLog_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

