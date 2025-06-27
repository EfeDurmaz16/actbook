import { HfInference } from '@huggingface/inference'
import OpenAI from 'openai'

function getOpenAIClient() {
  return process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }) : null
}

function getHFClient() {
  return process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null
}

export async function generateEmbedding(text: string): Promise<number[]> {
  // Try OpenAI first (most reliable)
  const openai = getOpenAIClient()
  if (openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      })
      
      return response.data[0].embedding
    } catch (error) {
      console.warn('OpenAI embedding failed, trying Hugging Face:', error)
    }
  }

  // Try HuggingFace as fallback
  const hf = getHFClient()
  if (hf) {
    try {
      const response = await hf.featureExtraction({
        model: 'BAAI/bge-small-en-v1.5',
        inputs: text,
      })

      let embedding: number[]
      if (Array.isArray(response) && Array.isArray(response[0])) {
        embedding = response[0] as number[]
      } else {
        embedding = response as number[]
      }
      return embedding
    } catch (error) {
      console.warn('HuggingFace embedding failed:', error)
    }
  }

  console.warn('No embedding service available, falling back to text similarity')
  return []
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0) {
    return 0
  }

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

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}

export async function findSimilarContent(
  queryText: string,
  contentItems: Array<{ id: string; text: string; embedding?: string }>,
  threshold: number = 0.7,
  limit: number = 10
): Promise<Array<{ id: string; text: string; similarity: number }>> {
  try {
    const queryEmbedding = await generateEmbedding(queryText)
    
    if (queryEmbedding.length === 0) {
      // Fallback to basic text similarity if embedding fails
      const stringSimilarity = await import('string-similarity-js')
      return contentItems
        .map(item => ({
          id: item.id,
          text: item.text,
          similarity: stringSimilarity.default(queryText.toLowerCase(), item.text.toLowerCase())
        }))
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
    }

    const similarities = contentItems.map(item => {
      let similarity = 0
      
      if (item.embedding) {
        try {
          const itemEmbedding = JSON.parse(item.embedding) as number[]
          similarity = cosineSimilarity(queryEmbedding, itemEmbedding)
        } catch (error) {
          console.error('Error parsing embedding for item:', item.id, error)
          similarity = 0
        }
      }

      return {
        id: item.id,
        text: item.text,
        similarity
      }
    })

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  } catch (error) {
    console.error('Error in semantic search:', error)
    return []
  }
}