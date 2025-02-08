"use client"

import { useRouter } from "next/navigation"
import CreateIntentForm from "./create-intent-form"

export default function CreateIntentWrapper({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()

  return (
    <CreateIntentForm
      initialQuery={initialQuery}
      onSuccess={() => {
        router.refresh()
      }}
    />
  )
}

