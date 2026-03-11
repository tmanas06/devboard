import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const start = Date.now();
        const result = await prisma.$queryRaw`SELECT 1`;
        console.log('Connected successfully in', Date.now() - start, 'ms', result);
    } catch (e) {
        console.error('Database connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
