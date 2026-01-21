import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

/**
 * Checks the physical location of the server hosting the domain.
 * Uses ip-api.com (Free tier: 45 requests / minute)
 * @param {string} urlString 
 * @returns {Promise<{country: string, city: string, lat: number, lon: number} | null>}
 */
export async function checkServerLocation(urlString) {
  try {
    let hostname = urlString;
    try {
      if (!hostname.startsWith('http')) {
        hostname = 'http://' + hostname;
      }
      hostname = new URL(hostname).hostname;
    } catch (e) {
      // use as is
    }

    // 1. Resolve DNS to get IP
    const { address } = await lookup(hostname);
    if (!address) {
      throw new Error(`Could not resolve DNS for ${hostname}`);
    }

    // 2. Fetch GeoIP data
    // Using ip-api.com because it's free and easy to use without API key for low volume
    const response = await fetch(`http://ip-api.com/json/${address}?fields=status,message,country,city,lat,lon,regionName`);
    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(data.message || 'GeoIP lookup failed');
    }

    return {
      country: data.country,
      city: data.city,
      regionName: data.regionName,
      lat: data.lat,
      lon: data.lon
    };

  } catch (error) {
    console.error(`GeoIP Check Error for ${urlString}:`, error.message);
    return null;
  }
}
