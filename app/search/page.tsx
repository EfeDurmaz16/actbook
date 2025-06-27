"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from "next/link"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useAuth } from '@/lib/AuthContext'
import { searchIntents, getAllIntents } from "@/lib/actions"
import IntentList from "@/components/intent-list"
import CreateIntentWrapper from "@/components/create-intent-wrapper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Intent } from "@/lib/types"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('query') || ''
  const { userId } = useAuth()
  
  const [query, setQuery] = useState(initialQuery)
  const [intents, setIntents] = useState<Intent[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const itemsPerPage = 5

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery, 1)
    } else {
      loadAllIntents(1)
    }
  }, [initialQuery])

  const handleSearch = async (searchQuery: string, page: number = 1) => {
    setLoading(true)
    try {
      console.log("Searching for query:", searchQuery, "page:", page)
      const results = await searchIntents(searchQuery, page, itemsPerPage, userId || undefined)
      console.log("Search results:", results)
      
      if (page === 1) {
        setIntents(results.intents)
      } else {
        setIntents(prev => [...prev, ...results.intents])
      }
      
      setTotalCount(results.totalCount)
      setHasMore(results.hasMore)
      setCurrentPage(page)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const loadAllIntents = async (page: number = 1) => {
    setLoading(true)
    try {
      const results = await getAllIntents(userId || undefined)
      // Simulate pagination for all intents
      const offset = (page - 1) * itemsPerPage
      const paginatedResults = results.slice(offset, offset + itemsPerPage)
      
      if (page === 1) {
        setIntents(paginatedResults)
      } else {
        setIntents(prev => [...prev, ...paginatedResults])
      }
      
      setTotalCount(results.length)
      setHasMore(offset + itemsPerPage < results.length)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error loading intents:", error)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIntents([]) // Clear previous results
    setCurrentPage(1)
    if (query.trim()) {
      handleSearch(query, 1)
    } else {
      loadAllIntents(1)
    }
  }

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      if (query.trim()) {
        handleSearch(query, currentPage + 1)
      } else {
        loadAllIntents(currentPage + 1)
      }
    }
  }

  if (initialLoad) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 relative">
      <Link href="/" passHref>
        <Button variant="ghost" className="absolute top-2 left-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>
      
      <div className="mt-12 mb-6">
        <h1 className="text-2xl font-bold mb-4">Search Activities</h1>
        
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for activities, interests, or people..."
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </form>

        {query && (
          <p className="text-sm text-muted-foreground mb-4">
            {totalCount > 0 
              ? `Showing ${intents.length} of ${totalCount} results for "${query}"`
              : `No results found for "${query}"`
            }
          </p>
        )}
      </div>

      {intents && intents.length > 0 ? (
        <div>
          <IntentList intents={intents} />
          
          {hasMore && (
            <div className="mt-6 text-center">
              <Button 
                onClick={handleLoadMore} 
                variant="outline" 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  "Loading..."
                ) : (
                  <>
                    Load More Results
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {!hasMore && totalCount > itemsPerPage && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              You've seen all {totalCount} results
            </p>
          )}
        </div>
      ) : !loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            {query ? "No matching activities found." : "No activities yet."}
          </p>
          <p className="text-sm text-muted-foreground">
            Try creating a new one below!
          </p>
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Create a New Activity</h2>
        <CreateIntentWrapper initialQuery={query} />
      </div>
    </div>
  )
}