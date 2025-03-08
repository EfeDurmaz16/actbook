const { PrismaClient } = require('@prisma/client');

// Create a new Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    // Attempt to connect and run a simple query
    console.log('Attempting to connect to database...');
    const users = await prisma.user.findMany({
      take: 1,
    });
    
    console.log('Connection successful!');
    console.log('Found users:', users);
    
    return { success: true };
  } catch (error) {
    console.error('Connection failed with error:');
    console.error(error);
    
    return { success: false, error };
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((result) => {
    console.log('Test complete:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error('Unexpected error:', e);
    process.exit(1);
  }); 