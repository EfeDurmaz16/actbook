import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { searchIntents, getAllIntents } from "@/lib/actions"
import IntentList from "@/components/intent-list"
import CreateIntentWrapper from "@/components/create-intent-wrapper"
import { Button } from "@/components/ui/button"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { query: string }
}) {
  const query = searchParams.query
  console.log("Searching for query:", query)
  let intents: any[] = []
  let error = null

  try {
    if (query) {
      intents = await searchIntents(query)
    } else {
      intents = await getAllIntents()
    }
    console.log("Search results or all intents:", intents)
  } catch (e) {
    console.error("Error searching intents:", e)
    error = "An error occurred while searching. Please try again."
  }

  return (
    <div className="max-w-2xl mx-auto p-6 relative">
      <Link href="/" passHref>
        <Button variant="ghost" className="absolute top-2 left-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-4 mt-12">{query ? `Search Results for: ${query}` : "All Intents"}</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {intents && intents.length > 0 ? (
        <IntentList intents={intents} />
      ) : (
        <p>No matching intents found. Try creating a new one!</p>
      )}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Create a New Intent</h2>
        <CreateIntentWrapper initialQuery={query} />
      </div>
    </div>
  )
}

