import net from 'net';

const TLD_WHOIS_SERVERS = {
  'com': 'whois.verisign-grs.com',
  'net': 'whois.verisign-grs.com',
  'org': 'whois.pir.org',
  'io': 'whois.nic.io',
  'co': 'whois.nic.co',
  'id': 'whois.pandi.or.id',
  'co.id': 'whois.pandi.or.id',
  'web.id': 'whois.pandi.or.id',
  'my.id': 'whois.pandi.or.id',
  'biz': 'whois.biz',
  'info': 'whois.afilias.net',
  'me': 'whois.nic.me',
  'xyz': 'whois.nic.xyz',
  'site': 'whois.nic.site',
  'online': 'whois.nic.online',
  'store': 'whois.nic.store',
  'tech': 'whois.nic.tech'
};

const DEFAULT_WHOIS_SERVER = 'whois.iana.org'; // Fallback to find authoritative server

async function performWhoisQuery(domain, server) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(43, server, () => {
      socket.write(`${domain}\r\n`);
    });

    let data = '';
    socket.setEncoding('utf8');

    socket.on('data', (chunk) => {
      data += chunk;
    });

    socket.on('end', () => {
      resolve(data);
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(5000, () => { // Reduced timeout to 5s to fail faster to RDAP
      socket.destroy();
      reject(new Error('WHOIS query timeout'));
    });
  });
}

// Simple regex patterns to capture expiry dates for common formats
const EXPIRY_PATTERNS = [
  /Registry Expiry Date:\s*([^\r\n]+)/i, // ICANN standard
  /Expiration Date:\s*([^\r\n]+)/i,
  /Domain Expiration Date:\s*([^\r\n]+)/i,
  /paid-till:\s*([^\r\n]+)/i,
  /expire-date:\s*([^\r\n]+)/i, // Indonesia .id
  /Expiry Date:\s*([^\r\n]+)/i,
];

function parseExpiryDate(rawText) {
  for (const pattern of EXPIRY_PATTERNS) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      // Try to parse the date
      const dateStr = match[1].trim();
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return null;
}


const MULTIPART_TLDS = [
  'co.id', 'web.id', 'ac.id', 'sch.id', 'go.id', 'mil.id', 'or.id', 'net.id', 'my.id', 'biz.id',
  'co.uk', 'org.uk', 'me.uk', 'net.uk',
  'com.sg', 'org.sg', 'edu.sg',
  'com.au', 'net.au', 'org.au'
];

const TLD_RDAP_SERVERS = {
  'id': 'https://rdap.pandi.id/rdap/',
  'co.id': 'https://rdap.pandi.id/rdap/',
  'web.id': 'https://rdap.pandi.id/rdap/',
  'my.id': 'https://rdap.pandi.id/rdap/',
  // Radix / CentralNic TLDs
  'site': 'https://rdap.centralnic.com/site/',
  'online': 'https://rdap.centralnic.com/online/',
  'store': 'https://rdap.centralnic.com/store/',
  'tech': 'https://rdap.centralnic.com/tech/',
  'xyz': 'https://rdap.centralnic.com/xyz/',
  'io': 'https://rdap.nic.io/domain/',
  'com': 'https://rdap.verisign.com/com/v1/',
  'net': 'https://rdap.verisign.com/net/v1/'
};

/**
 * Checks domain expiry using RDAP (HTTPS)
 * Useful fallback when Port 43 is blocked or WHOIS is unstructured
 */
async function checkRdap(domain) {
  let url = '';
  try {
    const parts = domain.split('.');
    const tld = parts.slice(-1)[0];
    const secondLevel = parts.slice(-2).join('.');

    let rdapBase = TLD_RDAP_SERVERS[secondLevel] || TLD_RDAP_SERVERS[tld];

    if (rdapBase) {
      // specific RDAP server logic
      // Common pattern: BASE_URL + "domain/" + DOMAIN
      // Verisign is BASE_URL + "domain/" + DOMAIN (matches)
      // Pandi is BASE_URL + "domain/" + DOMAIN (matches)
      // IO is https://rdap.nic.io/domain/DOMAIN (matches if base is https://rdap.nic.io/)

      // Normalize to ensure we append 'domain/' if not present in special cases, 
      // but for now most follow logic: BASE + "domain/" + domain

      // Handle Verisign which is strict
      if (rdapBase.includes('verisign')) {
        url = `${rdapBase}domain/${domain}`;
      }
      else if (rdapBase.includes('nic.io')) {
        url = `${rdapBase}${domain}`; // .io base already has /domain/
      }
      else {
        url = `${rdapBase}domain/${domain}`;
      }
    } else {
      // Default to IANA bootstrap
      url = `https://rdap.iana.org/domain/${domain}`;
    }

    console.log(`Checking RDAP for ${domain} at ${url}`);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/rdap+json' }
    });

    if (!response.ok) {
      // 404 means domain not found OR IANA doesn't know where to send us
      const errorText = await response.text().catch(() => '');
      throw new Error(`RDAP ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();

    // Parse RDAP 'events'
    if (data.events) {
      const expiryEvent = data.events.find(e =>
        e.eventAction === 'expiration' ||
        e.eventAction === 'registration expiration' ||
        e.eventAction === 'domain expiration'
      );

      if (expiryEvent && expiryEvent.eventDate) {
        return new Date(expiryEvent.eventDate);
      }
    }
    return null;
  } catch (error) {
    console.error(`RDAP Check Error for ${domain} (${url}):`, error.message);
    return null; // Fail gracefully
  }
}

function getRootDomain(hostname) {
  // Remove www.
  hostname = hostname.replace(/^www\./, '');

  const parts = hostname.split('.');

  if (parts.length <= 2) return hostname;

  // Check for multi-part TLDs (last 2 parts)
  const lastTwo = parts.slice(-2).join('.');
  if (MULTIPART_TLDS.includes(lastTwo)) {
    // It's a multipart TLD (e.g. web.id), so we need the last 3 parts (fphlab.web.id)
    return parts.slice(-3).join('.');
  }

  // Default to last 2 parts (example.com)
  return parts.slice(-2).join('.');
}

export async function checkDomainExpiry(urlString) {
  try {
    // Extract hostname
    let hostname = urlString;
    try {
      if (!hostname.startsWith('http')) {
        hostname = 'http://' + hostname;
      }
      hostname = new URL(hostname).hostname;
    } catch (e) {
      // use as is
    }

    // Get the actual root domain (e.g. fphlab.web.id instead of danus-cf.fphlab.web.id)
    const rootDomain = getRootDomain(hostname);

    // For determining WHOIS server logic, we still look at TLD/SLD of the root domain
    const parts = rootDomain.split('.');
    const tld = parts.slice(-1)[0];
    const secondLevel = parts.slice(-2).join('.'); // e.g. co.id or google.com -> google.com (wrong logic originally but safe for map lookup)
    // Actually the mapping keys are 'co.id', 'web.id' which aligns with secondLevel if it matches map

    // Determine WHOIS server
    // Note: Our map has 'co.id', 'web.id' etc. 
    // If rootDomain is 'fphlab.web.id', secondLevel is 'web.id'. Perfect.
    // If rootDomain is 'chemicfest9.site', secondLevel is 'chemicfest9.site'. Map lookup TLD_WHOIS_SERVERS['chemicfest9.site'] is undefined.
    // Then we try TLD_WHOIS_SERVERS['site']. Correct.
    let whoisServer = TLD_WHOIS_SERVERS[secondLevel] || TLD_WHOIS_SERVERS[tld] || DEFAULT_WHOIS_SERVER;

    // 1. Try WHOIS (Port 43) first using ROOT DOMAIN
    try {
      let rawData = await performWhoisQuery(rootDomain, whoisServer);

      // Handling redirect (referral)
      const referralMatch = rawData.match(/Registrar WHOIS Server:\s*([^\r\n]+)/i);
      if (referralMatch && referralMatch[1]) {
        const referredServer = referralMatch[1].trim();
        if (referredServer !== whoisServer && !referredServer.startsWith('http')) {
          rawData = await performWhoisQuery(rootDomain, referredServer);
        }
      }

      const expiry = parseExpiryDate(rawData);
      if (expiry) {
        return formatResult(expiry);
      }
    } catch (whoisError) {
      console.warn(`WHOIS (Port 43) failed for ${rootDomain}: ${whoisError.message}. Falling back to RDAP.`);
    }

    // 2. Fallback to RDAP (HTTPS Port 443) using ROOT DOMAIN
    const rdapExpiry = await checkRdap(rootDomain);
    if (rdapExpiry) {
      return formatResult(rdapExpiry);
    }

    return null;
  } catch (error) {
    console.error(`Domain Check Error for ${urlString}:`, error.message);
    return null;
  }
}

function formatResult(date) {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    expiryDate: date,
    daysRemaining
  };
}
