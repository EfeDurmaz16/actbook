import { HfInference } from '@huggingface/inference'

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

export async function generateEmbedding(text: string): Promise<number[]> {
  // Skip HuggingFace if no API key or insufficient permissions
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.warn('No Hugging Face API key provided, skipping embedding generation')
    return []
  }

  try {
    const response = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text,
    })

    // The response is a nested array, we want the first (and only) embedding
    return Array.isArray(response[0]) ? response[0] : response as number[]
  } catch (error) {
    console.warn('Error generating embedding (falling back to text similarity):', error)
    // Fallback to empty embedding if service fails
    return []
  }
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