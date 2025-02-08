import type { Intent } from "@/lib/types"

interface IntentWithSimilarity extends Intent {
  similarity?: number
}

export default function IntentList({ intents }: { intents: IntentWithSimilarity[] }) {
  return (
    <ul className="space-y-4">
      {intents.map((intent) => (
        <li key={intent.id} className="bg-white p-4 rounded-lg shadow">
          <p className="text-lg font-medium">{intent.text}</p>
          <p className="text-sm text-gray-500">Posted by: {intent.user}</p>
          {intent.similarity !== undefined && (
            <p className="text-xs text-gray-400 mt-1">Relevance: {(intent.similarity * 100).toFixed(1)}%</p>
          )}
        </li>
      ))}
    </ul>
  )
}

