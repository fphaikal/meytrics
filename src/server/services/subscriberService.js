import { db } from '../db.js';
import crypto from 'crypto';

// Get all subscribers
export function getAllSubscribers() {
  return db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all();
}

export function getSubscriberById(id) {
  return db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id);
}

export function getSubscriberByEmail(email) {
  return db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
}

export function getVerifiedSubscribers() {
  return db.prepare('SELECT * FROM subscribers WHERE verified = 1').all();
}

export function createSubscriber(email) {
  const existing = getSubscriberByEmail(email);
  if (existing) {
    throw new Error('Email already subscribed');
  }

  const token = crypto.randomBytes(32).toString('hex');

  const result = db.prepare(`
        INSERT INTO subscribers (email, verified, token)
        VALUES (?, 0, ?)
    `).run(email, token);

  return { id: result.lastInsertRowid, email, token };
}

export function verifySubscriber(token) {
  const subscriber = db.prepare('SELECT * FROM subscribers WHERE token = ?').get(token);

  if (!subscriber) {
    throw new Error('Invalid verification token');
  }

  if (subscriber.verified) {
    return { alreadyVerified: true };
  }

  db.prepare('UPDATE subscribers SET verified = 1, token = NULL WHERE id = ?').run(subscriber.id);
  return { success: true, email: subscriber.email };
}

export function deleteSubscriber(id) {
  return db.prepare('DELETE FROM subscribers WHERE id = ?').run(id);
}

export function unsubscribeByEmail(email) {
  const subscriber = getSubscriberByEmail(email);
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
