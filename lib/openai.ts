import { HfInference } from "@huggingface/inference"

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: text,
    })
    return response
  } catch (error) {
    console.error("Error getting embedding:", error)
    throw new Error("Failed to get embedding")
  }
}

