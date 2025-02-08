import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl font-bold">ActBook</h1>
      <div className="w-full max-w-md space-y-8">
        <form action="/search" className="space-y-4">
          <Input type="text" name="query" placeholder="Describe what you're looking for..." className="w-full" />
          <Button type="submit" className="w-full">
            Search
          </Button>
        </form>
      </div>
    </main>
  )
}

