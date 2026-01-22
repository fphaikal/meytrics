import { db } from '../db.js';
import crypto from 'crypto';

// Get all subscribers
export async function getAllSubscribers() {
  return db.subscriber.findMany({
    orderBy: { created_at: 'desc' }
  });
}

export async function getSubscriberById(id) {
  return db.subscriber.findUnique({
    where: { id: parseInt(id) }
  });
}

export async function getSubscriberByEmail(email) {
  return db.subscriber.findUnique({
    where: { email }
  });
}

export async function getVerifiedSubscribers() {
  return db.subscriber.findMany({
    where: { verified: 1 }
  });
}

export async function createSubscriber(email) {
  // Prisma throws specific error on unique constraint violation needed to be handled or checked first
  const existing = await getSubscriberByEmail(email);
  if (existing) {
    throw new Error('Email already subscribed');
  }

  const token = crypto.randomBytes(32).toString('hex');

  const result = await db.subscriber.create({
    data: {
      email,
      verified: 0,
      token
    }
  });

  return { id: result.id, email, token };
}

export async function verifySubscriber(token) {
  // Find subscriber by token (token is not unique constraint index in schema? 
  // It should be ideally, but schema.prisma shows `token String?`, no unique.
  // So findFirst is safer.
  const subscriber = await db.subscriber.findFirst({
    where: { token }
  });

  if (!subscriber) {
    throw new Error('Invalid verification token');
  }

  if (subscriber.verified) {
    return { alreadyVerified: true };
  }

  await db.subscriber.update({
    where: { id: subscriber.id },
    data: { verified: 1, token: null }
  });

  return { success: true, email: subscriber.email };
}

export async function deleteSubscriber(id) {
  return db.subscriber.delete({
    where: { id: parseInt(id) }
  });
}

export async function unsubscribeByEmail(email) {
  const subscriber = await getSubscriberByEmail(email);
  if (!subscriber) {
    throw new Error('Email not found');
  }
  return deleteSubscriber(subscriber.id);
}

// Generate unsubscribe token
export function getUnsubscribeToken(email) {
  const hash = crypto.createHash('sha256').update(email + process.env.SECRET || 'meytrics-secret').digest('hex');
  return hash.substring(0, 32);
}

export function verifyUnsubscribeToken(email, token) {
  return getUnsubscribeToken(email) === token;
}
