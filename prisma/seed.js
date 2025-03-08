const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    // First, clear existing data to avoid foreign key issues
    console.log('Cleaning up existing data...')
    await prisma.intent.deleteMany({})
    await prisma.user.deleteMany({})
    
    // Create some users
    console.log('Creating users...')
    const users = [
      { username: 'Alice', password: 'password123' },
      { username: 'Bob', password: 'password123' },
      { username: 'Charlie', password: 'password123' },
      { username: 'David', password: 'password123' },
      { username: 'Eve', password: 'password123' }
    ];

    const createdUsers = []
    
    for (const userData of users) {
      const user = await prisma.user.create({
        data: userData
      });
      createdUsers.push(user)
      console.log(`Created user: ${userData.username} with ID ${user.id}`);
    }
    
    // Sample intents
    console.log('Creating intents...')
    const intentTexts = [
      "Looking for a new game to play",
      "Need an easy meal to cook",
      "Searching for a good book to read",
      "Want to learn a new programming language",
      "Seeking recommendations for a weekend getaway",
      "Looking for a new hobby to try",
      "Need tips for improving productivity",
      "Searching for a good workout routine",
      "Want to start a vegetable garden",
      "Looking for volunteer opportunities in my area",
    ];

    // Create intents with proper user IDs
    for (const text of intentTexts) {
      // Assign each intent to a random user
      const randomUserIndex = Math.floor(Math.random() * createdUsers.length);
      const user = createdUsers[randomUserIndex];
      
      const intent = await prisma.intent.create({
        data: {
          text,
          userId: user.id
        }
      });
      
      console.log(`Created intent: "${intent.text}" for user ${user.username}`);
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('ERROR DURING SEEDING:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 