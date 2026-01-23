import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

const dbFileName = 'meytrics.db';
const defaultDbPath = process.env.DATA_DIR
  ? `file:${path.join(process.env.DATA_DIR, dbFileName)}`
  : `file:${path.join(projectRoot, 'data', dbFileName)}`;

// Fix: If DATABASE_URL is set to the Prisma CLI friendly path (../data/meytrics.db), 
// resolve it to absolute path for runtime to avoid CWD issues.
let envUrl = process.env.DATABASE_URL;
if (envUrl && envUrl.includes('file:../data/meytrics.db')) {
  envUrl = defaultDbPath;
}

const databaseUrl = envUrl || defaultDbPath;

export const db = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: ['error', 'warn'],
});

export async function initDatabase() {
  console.log('📦 Initializing database via Prisma...');
  try {
    await db.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}
