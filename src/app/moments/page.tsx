"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

interface Moment {
  id: string
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO"
  content: string
  createdAt: string
}

export default function MomentsPage() {
  const { data: session } = useSession()
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMoments()
  }, [])

  const fetchMoments = async () => {
    const res = await fetch("/api/moments")
    if (res.ok) {
      const data = await res.json()
      setMoments(data.moments)
    }
    setLoading(false)
  }

  // Group moments by date in descending order
  const groupedMoments = moments.reduce((groups, moment) => {
    const date = new Date(moment.createdAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(moment)
    return groups
  }, {} as Record<string, Moment[]>)

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedMoments).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading moments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.h1
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              All Moments
            </motion.h1>
            <div className="flex items-center space-x-6">
              <motion.span
                className="text-gray-700 dark:text-gray-300 font-medium"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Welcome, {session?.user?.name || session?.user?.email}
              </motion.span>
              <Link href="/">
                <motion.button
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  ← Back to Calendar
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No moments yet. <Link href="/" className="text-blue-600 hover:text-blue-700 underline">Add your first moment</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {sortedDates.map((date, dateIndex) => (
              <motion.div
                key={date}
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: dateIndex * 0.1 }}
              >
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
                <motion.div
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                >
                  {groupedMoments[date]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((moment, index) => (
                    <motion.div
                      key={moment.id}
                      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300"
                      variants={{
                        hidden: { opacity: 0, y: 20, scale: 0.9 },
                        visible: { opacity: 1, y: 0, scale: 1 }
                      }}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        transition: { duration: 0.2 }
                      }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {new Date(moment.createdAt).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <motion.button
                            onClick={() => window.location.href = `/?edit=${moment.id}`}
                            className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            ✏️ Edit
                          </motion.button>
                          <div className="text-2xl">
                            {moment.type === "TEXT" && "📝"}
                            {moment.type === "IMAGE" && "📷"}
                            {moment.type === "VIDEO" && "🎥"}
                            {moment.type === "AUDIO" && "🎵"}
                          </div>
                        </div>
                      </div>
                      {moment.type === "TEXT" && (
                        <motion.p
                          className="text-gray-900 dark:text-white text-lg leading-relaxed"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {moment.content}
                        </motion.p>
                      )}
                      {moment.type === "IMAGE" && (
                        <motion.img
                          src={moment.content}
                          alt="Moment"
                          className="w-full h-48 object-cover rounded-xl shadow-md"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                        />
                      )}
                      {moment.type === "VIDEO" && (
                        <motion.video
                          controls
                          className="w-full h-48 object-cover rounded-xl shadow-md"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <source src={moment.content} />
                        </motion.video>
                      )}
                      {moment.type === "AUDIO" && (
                        <motion.div
                          className="flex items-center justify-center h-48 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <audio controls className="w-full max-w-xs">
                            <source src={moment.content} />
                          </audio>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
