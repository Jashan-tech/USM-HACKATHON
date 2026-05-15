// =============================================================================
// NEXUS HEALTH - BullMQ Job Queue Configuration
// =============================================================================

import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from './redis';

// Queue names
export const QUEUE_NAMES = {
  ELIGIBILITY_CHECK: 'eligibility-check',
  PRIOR_AUTH: 'prior-auth',
  STAFF_SCHEDULING: 'staff-scheduling',
  FOLLOW_UP: 'follow-up',
  DOCUMENT_EXTRACTION: 'document-extraction',
  RISK_CALCULATION: 'risk-calculation',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job data types
export interface EligibilityCheckJobData {
  referral_id: string;
  payer_id: string;
  member_id: string;
  insurance_type: string;
}

export interface PriorAuthJobData {
  referral_id: string;
  payer_id: string;
  service_codes: string[];
  diagnosis_codes: string[];
}

export interface StaffSchedulingJobData {
  referral_id: string;
  task_id: string;
  preferred_availability?: unknown[];
  specialist_npi?: string;
}

export interface FollowUpJobData {
  referral_id: string;
  patient_id: string;
  doctor_id: string;
  follow_up_type: 'INITIAL' | 'REMINDER' | 'ESCALATION';
}

export interface DocumentExtractionJobData {
  referral_id: string;
  document_url: string;
  document_type: string;
}

export interface RiskCalculationJobData {
  referral_id: string;
}

export interface NotificationJobData {
  user_id: string;
  type: 'IN_APP' | 'EMAIL' | 'SMS';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Queue instances (singleton pattern)
const queues: Map<string, Queue> = new Map();

/**
 * Get or create a queue instance
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const redis = getRedisClient();
    const queue = new Queue(name, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs
          age: 7 * 24 * 3600, // Keep for 7 days
        },
      },
    });
    queues.set(name, queue);
  }
  return queues.get(name)!;
}

// =============================================================================
// JOB CREATORS
// =============================================================================

/**
 * Add an eligibility check job to the queue
 */
export async function addEligibilityCheckJob(data: EligibilityCheckJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.ELIGIBILITY_CHECK);
  return queue.add('check-eligibility', data, {
    priority: 2,
  });
}

/**
 * Add a prior auth job to the queue
 */
export async function addPriorAuthJob(data: PriorAuthJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.PRIOR_AUTH);
  return queue.add('submit-prior-auth', data, {
    priority: 2,
  });
}

/**
 * Add a staff scheduling job to the queue
 */
export async function addStaffSchedulingJob(data: StaffSchedulingJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.STAFF_SCHEDULING);
  return queue.add('schedule-appointment', data, {
    priority: 1, // High priority for staff-assisted scheduling
  });
}

/**
 * Add a follow-up job to the queue
 */
export async function addFollowUpJob(data: FollowUpJobData, delay?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.FOLLOW_UP);
  return queue.add('send-follow-up', data, {
    priority: 3,
    delay: delay || 0,
  });
}

/**
 * Add a document extraction job to the queue
 */
export async function addDocumentExtractionJob(data: DocumentExtractionJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.DOCUMENT_EXTRACTION);
  return queue.add('extract-document', data, {
    priority: 2,
  });
}

/**
 * Add a risk calculation job to the queue
 */
export async function addRiskCalculationJob(data: RiskCalculationJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.RISK_CALCULATION);
  return queue.add('calculate-risk', data, {
    priority: 2,
  });
}

/**
 * Add a notification job to the queue
 */
export async function addNotificationJob(data: NotificationJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.NOTIFICATIONS);
  return queue.add('send-notification', data, {
    priority: 3,
  });
}

// =============================================================================
// WORKER FACTORY
// =============================================================================

export interface WorkerConfig {
  name: QueueName;
  processor: (job: Job) => Promise<unknown>;
  concurrency?: number;
}

/**
 * Create a worker for a specific queue
 */
export function createWorker(config: WorkerConfig): Worker {
  const redis = getRedisClient();

  const worker = new Worker(config.name, config.processor, {
    connection: redis,
    concurrency: config.concurrency || 5,
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} in ${config.name} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} in ${config.name} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error(`Worker error in ${config.name}:`, err);
  });

  return worker;
}

// =============================================================================
// CLEANUP
// =============================================================================

export async function closeQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((queue) => queue.close());
  await Promise.all(closePromises);
  queues.clear();
}
