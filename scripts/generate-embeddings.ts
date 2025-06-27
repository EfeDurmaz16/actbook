import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { prisma } from '../lib/db'
import { generateEmbedding } from '../lib/semantic-search'

async function generateEmbeddingsForExistingIntents() {
  console.log('Starting to generate embeddings for existing intents...')
  console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing')
  console.log('HuggingFace API Key:', process.env.HUGGINGFACE_API_KEY ? 'Present' : 'Missing')
  
  // Get all intents without embeddings
  const intents = await prisma.intent.findMany({
    where: {
      OR: [
        { embedding: null },
        { embedding: '' }
      ]
    }
  })
  
  console.log(`Found ${intents.length} intents without embeddings`)
  
  let processed = 0
  let successful = 0
  
  for (const intent of intents) {
    try {
      console.log(`Processing intent ${processed + 1}/${intents.length}: "${intent.text}"`)
      
      const embedding = await generateEmbedding(intent.text)
      
      if (embedding.length > 0) {
        await prisma.intent.update({
          where: { id: intent.id },
          data: { embedding: JSON.stringify(embedding) }
        })
        successful++
        console.log(`✅ Generated embedding for: "${intent.text}"`)
      } else {
        console.log(`❌ Failed to generate embedding for: "${intent.text}"`)
      }
      
      processed++
      
      // Add a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Error processing intent "${intent.text}":`, error)
      processed++
    }
  }
  
  console.log(`\n🎉 Completed! Processed ${processed} intents, ${successful} successful embeddings generated.`)
  
  // Test semantic search
  console.log('\n🔍 Testing semantic search...')
  
  const testQuery = 'cooking food'
  console.log(`Searching for: "${testQuery}"`)
  
  const testEmbedding = await generateEmbedding(testQuery)
  if (testEmbedding.length > 0) {
    const intentsWithEmbeddings = await prisma.intent.findMany({
      where: {
        embedding: { not: null },
        isActive: true
      },
      include: { user: true }
    })
    
    console.log(`Found ${intentsWithEmbeddings.length} intents with embeddings for comparison`)
    
    // Calculate similarities
    const similarities = intentsWithEmbeddings.map(intent => {
      const intentEmbedding = JSON.parse(intent.embedding!)
      const similarity = cosineSimilarity(testEmbedding, intentEmbedding)
      return {
        text: intent.text,
        user: intent.user.username,
        similarity
      }
    }).sort((a, b) => b.similarity - a.similarity)
    
    console.log('\n📊 Top 5 semantic matches:')
    similarities.slice(0, 5).forEach((result, index) => {
      console.log(`${index + 1}. "${result.text}" (${result.user}) - Similarity: ${result.similarity.toFixed(3)}`)
    })
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)
  
  if (normA === 0 || normB === 0) return 0
  
  return dotProduct / (normA * normB)
}

// Run the script
generateEmbeddingsForExistingIntents()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })