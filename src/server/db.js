import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

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

    // Check if any users exist, if not create default admin
    const userCount = await db.user.count();
    if (userCount === 0) {
      console.log('👤 No users found. Creating default admin user...');
      const hashedPassword = bcrypt.hashSync('admin123', 10);

      await db.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'admin'
        }
      });
      console.log('✅ Default admin user created: admin / admin123');
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}
