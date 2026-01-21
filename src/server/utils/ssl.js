import https from 'https';
import { URL } from 'url';

/**
 * Checks SSL certificate expiry for a given URL
 * @param {string} urlString 
 * @returns {Promise<{validTo: Date, daysRemaining: number} | null>}
 */
export function checkSSL(urlString) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure protocol is https
      if (!urlString.startsWith('https://')) {
        urlString = urlString.replace(/^http:\/\//, 'https://');
        if (!urlString.startsWith('https://')) {
          urlString = 'https://' + urlString;
        }
      }

      const url = new URL(urlString);

      const options = {
        hostname: url.hostname,
        port: 443,
        method: 'GET',
        agent: false,
        rejectUnauthorized: false, // We just want to check the cert properties, even if invalid
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();

        if (cert && cert.valid_to) {
          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const diffTime = validTo.getTime() - now.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          resolve({
            validTo,
            daysRemaining
          });
        } else {
          resolve(null);
        }
      });

      req.on('error', (e) => {
        // If it's a connection error, resolving null is safer than rejecting whole job
        console.error(`SSL Check Error for ${url.hostname}:`, e.message);
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    } catch (error) {
      console.error(`SSL Check Error:`, error.message);
      resolve(null);
    }
  });
}
