import express from 'express';
import {
  getAllSubscribers,
  createSubscriber,
  deleteSubscriber,
  verifySubscriber,
  unsubscribeByEmail,
  getUnsubscribeToken,
  verifyUnsubscribeToken
} from '../services/subscriberService.js';
import { sendTestEmail } from '../services/emailService.js';

const router = express.Router();

// Admin: Get all subscribers
router.get('/', (req, res) => {
  try {
    const subscribers = getAllSubscribers();
    res.json(subscribers.map(s => ({
      ...s,
      verified: !!s.verified
    })));
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// Admin: Delete subscriber
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteSubscriber(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

// Public: Subscribe to updates
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const result = createSubscriber(email);

    // TODO: Send verification email with token
    // For now, auto-verify (in production, send email with verification link)
    console.log(`📧 New subscriber: ${email} (token: ${result.token})`);

    res.status(201).json({
      success: true,
      message: 'Subscribed successfully! Please check your email to verify.',
      // In dev mode, return token for testing
      ...(process.env.NODE_ENV !== 'production' && { verifyToken: result.token })
    });
  } catch (error) {
    if (error.message === 'Email already subscribed') {
      return res.status(409).json({ error: 'Email already subscribed' });
    }
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Public: Verify email subscription
router.get('/verify/:token', (req, res) => {
  try {
    const { token } = req.params;
    const result = verifySubscriber(token);

    if (result.alreadyVerified) {
      return res.json({ success: true, message: 'Email already verified' });
    }

    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    if (error.message === 'Invalid verification token') {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }
    console.error('Error verifying:', error);
    res.status(500).json({ error: 'Failed to verify' });
  }
});

// Public: Unsubscribe
router.post('/unsubscribe', (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Verify unsubscribe token if provided
    if (token && !verifyUnsubscribeToken(email, token)) {
      return res.status(400).json({ error: 'Invalid unsubscribe link' });
    }

    unsubscribeByEmail(email);
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    if (error.message === 'Email not found') {
      return res.status(404).json({ error: 'Email not found' });
    }
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Get unsubscribe link token (for email footers)
router.get('/unsubscribe-token/:email', (req, res) => {
  try {
    const { email } = req.params;
    const token = getUnsubscribeToken(email);
    res.json({ token });
  } catch (error) {
    console.error('Error generating unsubscribe token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
