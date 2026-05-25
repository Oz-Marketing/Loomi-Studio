/**
 * Loomi Studio worker process.
 *
 * Runs pg-boss alongside the web server (separate PM2 process) and fires
 * recurring jobs that move scheduled campaigns through their pipeline.
 *
 * Start locally: `npm run worker:start`
 * PM2 in prod:  see ecosystem.config.js
 *
 * `./boot` MUST be the first import: it loads .env / .env.local before
 * ESM resolves the rest of the module graph, which transitively pulls in
 * `src/lib/prisma.ts` whose PrismaClient reads DATABASE_URL at module
 * load time. Re-ordering these imports will silently fall back to the
 * dev DATABASE_URL default and break production sends.
 */
import './boot';

import { getBoss, stopBoss } from '@/lib/queue/boss';
import {
  processDueEmailCampaigns,
} from '@/lib/services/email-campaigns';
import {
  processDueSmsCampaigns,
} from '@/lib/services/sms-campaigns';
import {
  processDueFlowEnrollments,
  processFlowTriggers,
} from '@/lib/services/loomi-flows';

const PROCESS_DUE_CAMPAIGNS_QUEUE = 'loomi.process-due-campaigns';
const PROCESS_FLOW_ENROLLMENTS_QUEUE = 'loomi.process-flow-enrollments';
const PROCESS_FLOW_TRIGGERS_QUEUE = 'loomi.process-flow-triggers';

async function runProcessDueCampaigns(): Promise<void> {
  const startedAt = Date.now();
  try {
    const emailResults = await processDueEmailCampaigns({ limit: 5, concurrency: 3 });
    if (emailResults.length > 0) {
      console.log(
        `[worker] processed ${emailResults.length} email campaign(s) in ${Date.now() - startedAt}ms`,
      );
    }
  } catch (err) {
    console.error('[worker] processDueEmailCampaigns failed', err);
  }
  try {
    const smsResults = await processDueSmsCampaigns({ limit: 5, concurrency: 3 });
    if (smsResults.length > 0) {
      console.log(
        `[worker] processed ${smsResults.length} sms campaign(s) in ${Date.now() - startedAt}ms`,
      );
    }
  } catch (err) {
    console.error('[worker] processDueSmsCampaigns failed', err);
  }
}

async function runProcessFlowEnrollments(): Promise<void> {
  const startedAt = Date.now();
  try {
    const result = await processDueFlowEnrollments({ limit: 25 });
    if (result.processed > 0) {
      console.log(
        `[worker] advanced ${result.processed} flow enrollment(s) in ${Date.now() - startedAt}ms`,
      );
    }
  } catch (err) {
    console.error('[worker] processDueFlowEnrollments failed', err);
  }
}

async function runProcessFlowTriggers(): Promise<void> {
  const startedAt = Date.now();
  try {
    const result = await processFlowTriggers();
    if (result.enrolled > 0 || result.triggersProcessed > 0) {
      console.log(
        `[worker] flow triggers: ${result.triggersProcessed} polled, ${result.enrolled} new enrollment(s) in ${Date.now() - startedAt}ms`,
      );
    }
  } catch (err) {
    console.error('[worker] processFlowTriggers failed', err);
  }
}

async function main(): Promise<void> {
  const boss = await getBoss();
  console.log('[worker] pg-boss started');

  await boss.createQueue(PROCESS_DUE_CAMPAIGNS_QUEUE);
  await boss.work(PROCESS_DUE_CAMPAIGNS_QUEUE, async () => {
    await runProcessDueCampaigns();
  });

  await boss.createQueue(PROCESS_FLOW_ENROLLMENTS_QUEUE);
  await boss.work(PROCESS_FLOW_ENROLLMENTS_QUEUE, async () => {
    await runProcessFlowEnrollments();
  });

  await boss.createQueue(PROCESS_FLOW_TRIGGERS_QUEUE);
  await boss.work(PROCESS_FLOW_TRIGGERS_QUEUE, async () => {
    await runProcessFlowTriggers();
  });

  // Recurring schedule: every minute. pg-boss is idempotent on schedule
  // creation, so this is safe to call on every boot.
  await boss.schedule(PROCESS_DUE_CAMPAIGNS_QUEUE, '* * * * *');
  console.log('[worker] scheduled', PROCESS_DUE_CAMPAIGNS_QUEUE, 'every minute');

  // Flow enrollments tick every minute (matches the wait-node minimum
  // resolution); trigger polling every 5 minutes since list/audience
  // membership changes are coarse and we don't want to thrash the DB.
  await boss.schedule(PROCESS_FLOW_ENROLLMENTS_QUEUE, '* * * * *');
  console.log('[worker] scheduled', PROCESS_FLOW_ENROLLMENTS_QUEUE, 'every minute');

  await boss.schedule(PROCESS_FLOW_TRIGGERS_QUEUE, '*/5 * * * *');
  console.log('[worker] scheduled', PROCESS_FLOW_TRIGGERS_QUEUE, 'every 5 minutes');

  // Also run once immediately so the first send doesn't have to wait up
  // to a minute after boot.
  await runProcessDueCampaigns();
  await runProcessFlowTriggers();
  await runProcessFlowEnrollments();

  const shutdown = async (signal: string) => {
    console.log(`[worker] received ${signal}, shutting down`);
    try {
      await stopBoss();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
