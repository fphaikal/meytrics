import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

const dbFileName = 'monitor.db';
const defaultDbPath = process.env.DATA_DIR
  ? `file:${path.join(process.env.DATA_DIR, dbFileName)}`
  : `file:${path.join(projectRoot, 'data', dbFileName)}`;

const databaseUrl = process.env.DATABASE_URL || defaultDbPath;

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
