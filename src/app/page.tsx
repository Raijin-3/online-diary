"use client"

import { useSession } from "next-auth/react"
import { Dashboard } from "./components/Dashboard"
import { AuthPage } from "./components/AuthPage"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (session) {
    return <Dashboard />
  }

  return <AuthPage />
}
