"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"
import Link from "next/link"

interface Moment {
  id: string
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO"
  content: string
  createdAt: string
}

export function Dashboard() {
  const { data: session } = useSession()
  const [moments, setMoments] = useState<Moment[]>([])
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [showMedia, setShowMedia] = useState(false)
  const [error, setError] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"TEXT" | "IMAGE" | "VIDEO" | "AUDIO">("TEXT")
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [selectedDateMoments, setSelectedDateMoments] = useState<Moment[]>([])
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false)

  useEffect(() => {
    fetchMoments()

    // Check for edit parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const editId = urlParams.get('edit')
    if (editId && moments.length > 0) {
      const momentToEdit = moments.find(m => m.id === editId)
      if (momentToEdit) {
        setEditingMoment(momentToEdit)
        setEditModalOpen(true)
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [moments])

  // Initialize edit content when editing moment changes
  useEffect(() => {
    if (editingMoment) {
      if (editingMoment.type === "TEXT") {
        setContent(editingMoment.content)
      } else {
        setContent("")
        setFile(null)
      }
      setSelectedDate(new Date(editingMoment.createdAt).toISOString().split('T')[0])
    }
  }, [editingMoment])

  const fetchMoments = async () => {
    const res = await fetch("/api/moments")
    if (res.ok) {
      const data = await res.json()
      setMoments(data.moments)
    }
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: modalType === "IMAGE" || modalType === "VIDEO",
        audio: modalType === "VIDEO" || modalType === "AUDIO"
      })
      setStream(mediaStream)
    } catch (error) {
      console.error("Error accessing media devices:", error)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const captureImage = () => {
    if (!stream) return
    const video = document.querySelector('video') as HTMLVideoElement
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' })
        setFile(file)
      }
    })
    stopCamera()
  }

  const startRecording = () => {
    if (!stream) return
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: modalType === "VIDEO" ? 'video/webm' : 'audio/webm' })
      const file = new File([blob], `recording-${Date.now()}.${modalType === "VIDEO" ? 'webm' : 'webm'}`, { type: blob.type })
      setFile(file)
      setRecordedChunks([])
    }
    recorder.start()
    setMediaRecorder(recorder)
    setRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setRecording(false)
      setMediaRecorder(null)
    }
    stopCamera()
  }

  const handleAddMoment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (modalType === "TEXT" && !content.trim()) return
    if (modalType !== "TEXT" && !file) return
    if (!selectedDate) return

    setLoading(true)
    const formData = new FormData()
    formData.append("type", modalType)
    formData.append("date", selectedDate)
    if (modalType === "TEXT") {
      formData.append("content", content)
    } else {
      formData.append("file", file!)
    }

    const res = await fetch("/api/moments", {
      method: "POST",
      body: formData,
    })
    if (res.ok) {
      const data = await res.json()
      setMoments([data.moment, ...moments])
      setContent("")
      setFile(null)
      setSelectedDate("")
      setShowMedia(false)
      setModalOpen(false)
    } else {
      const data = await res.json()
      setError(data.error || "Failed to add moment")
    }
    setLoading(false)
  }

  const handleEditMoment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMoment) return
    setError("")
    if (editingMoment.type === "TEXT" && !content.trim()) return
    if (editingMoment.type !== "TEXT" && !file) return

    setLoading(true)
    const formData = new FormData()
    formData.append("type", editingMoment.type)
    formData.append("date", selectedDate)
    if (editingMoment.type === "TEXT") {
      formData.append("content", content)
    } else {
      formData.append("file", file!)
    }

    const res = await fetch(`/api/moments/${editingMoment.id}`, {
      method: "PUT",
      body: formData,
    })
    if (res.ok) {
      const data = await res.json()
      setMoments(moments.map(m => m.id === editingMoment.id ? data.moment : m))
      setContent("")
      setFile(null)
      setSelectedDate("")
      setShowMedia(false)
      setEditModalOpen(false)
      setEditingMoment(null)
      setDateModalOpen(false) // Close the date modal to refresh the view
    } else {
      const data = await res.json()
      setError(data.error || "Failed to update moment")
    }
    setLoading(false)
  }

  const getMomentsForDate = (date: Date) => {
    const dateStr = date.toDateString()
    return moments.filter(moment => new Date(moment.createdAt).toDateString() === dateStr)
  }

  const getMomentTypesForDate = (date: Date) => {
    const momentsForDate = getMomentsForDate(date)
    return [...new Set(momentsForDate.map(m => m.type))]
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.h1
              className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              Online Diary
            </motion.h1>
            <motion.button
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1">
                <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transform transition-all duration-300 ${showHamburgerMenu ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-all duration-300 ${showHamburgerMenu ? 'opacity-0' : ''}`}></span>
                <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transform transition-all duration-300 ${showHamburgerMenu ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Hamburger Menu Overlay */}
        {showHamburgerMenu && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowHamburgerMenu(false)}
          />
        )}

        {/* Hamburger Menu */}
        {showHamburgerMenu && (
          <motion.div
            className="absolute top-full left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-xl border-b border-gray-200/50 dark:border-gray-700/50 z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
              {/* Welcome Message */}
              <div className="text-center py-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Welcome, {session?.user?.name || session?.user?.email}
                </p>
              </div>

              {/* All Moments Link */}
              <Link href="/moments" onClick={() => setShowHamburgerMenu(false)}>
                <motion.div
                  className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-2xl">📚</span>
                  <span className="text-lg font-medium text-gray-900 dark:text-white">All Moments</span>
                </motion.div>
              </Link>

              {/* Add Moment Buttons */}
              <div className="space-y-2">
                <motion.button
                  onClick={() => {
                    setModalType("TEXT")
                    setModalOpen(true)
                    setShowHamburgerMenu(false)
                  }}
                  className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-xl">📝</span>
                  <span className="text-lg font-medium">Add Text</span>
                </motion.button>

                <motion.button
                  onClick={() => {
                    setModalType("IMAGE")
                    setModalOpen(true)
                    setShowHamburgerMenu(false)
                  }}
                  className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-xl">📷</span>
                  <span className="text-lg font-medium">Add Image</span>
                </motion.button>

                <motion.button
                  onClick={() => {
                    setModalType("VIDEO")
                    setModalOpen(true)
                    setShowHamburgerMenu(false)
                  }}
                  className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-xl">🎥</span>
                  <span className="text-lg font-medium">Add Video</span>
                </motion.button>

                <motion.button
                  onClick={() => {
                    setModalType("AUDIO")
                    setModalOpen(true)
                    setShowHamburgerMenu(false)
                  }}
                  className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-xl">🎵</span>
                  <span className="text-lg font-medium">Add Audio</span>
                </motion.button>
              </div>

              {/* Sign Out Button */}
              <motion.button
                onClick={() => {
                  signOut()
                  setShowHamburgerMenu(false)
                }}
                className="w-full flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-xl">🚪</span>
                <span className="text-lg font-medium">Sign Out</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </header>

      <main className="py-8">
        

        <motion.div
          className="mb-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Calendar View</h2>
          </div>

          {/* Desktop Layout: Calendar Left, Buttons Right */}
          <div className="hidden lg:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 gap-8">
            <div className="flex-1">
              <Calendar
                onChange={(value) => {
                  const date = value as Date
                  const momentsForDate = getMomentsForDate(date)
                  setSelectedDateMoments(momentsForDate)
                  setDateModalOpen(true)
                }}
                value={null}
                tileDisabled={({ date, view }) => {
                  if (view === 'month') {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return date > today
                  }
                  return false
                }}
                tileContent={({ date, view }) => {
                  if (view === 'month') {
                    const types = getMomentTypesForDate(date)
                    if (types.length > 0) {
                      return (
                        <div className="flex justify-center mt-1 space-x-1">
                          {types.includes('TEXT') && <span className="text-lg animate-pulse">📝</span>}
                          {types.includes('IMAGE') && <span className="text-lg animate-pulse">📷</span>}
                          {types.includes('VIDEO') && <span className="text-lg animate-pulse">🎥</span>}
                          {types.includes('AUDIO') && <span className="text-lg animate-pulse">🎵</span>}
                        </div>
                      )
                    }
                  }
                  return null
                }}
                className="rounded-xl overflow-hidden shadow-inner"
              />
            </div>

            <div className="w-80 flex flex-col gap-4">
              <motion.button
                onClick={() => {
                  setModalType("TEXT")
                  setModalOpen(true)
                }}
                className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl">📝</span>
                <span className="text-lg font-medium">Add Text</span>
              </motion.button>
              <motion.button
                onClick={() => {
                  setModalType("IMAGE")
                  setModalOpen(true)
                }}
                className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl">📷</span>
                <span className="text-lg font-medium">Add Image</span>
              </motion.button>
              <motion.button
                onClick={() => {
                  setModalType("VIDEO")
                  setModalOpen(true)
                }}
                className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl">🎥</span>
                <span className="text-lg font-medium">Add Video</span>
              </motion.button>
              <motion.button
                onClick={() => {
                  setModalType("AUDIO")
                  setModalOpen(true)
                }}
                className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl">🎵</span>
                <span className="text-lg font-medium">Add Audio</span>
              </motion.button>
            </div>
          </div>

          {/* Mobile/Tablet Layout: Centered Calendar */}
          <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Calendar
              onChange={(value) => {
                const date = value as Date
                const momentsForDate = getMomentsForDate(date)
                setSelectedDateMoments(momentsForDate)
                setDateModalOpen(true)
              }}
              value={null}
              tileDisabled={({ date, view }) => {
                if (view === 'month') {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return date > today
                }
                return false
              }}
              tileContent={({ date, view }) => {
                if (view === 'month') {
                  const types = getMomentTypesForDate(date)
                  if (types.length > 0) {
                    return (
                      <div className="flex justify-center mt-1 space-x-1">
                        {types.includes('TEXT') && <span className="text-lg animate-pulse">📝</span>}
                        {types.includes('IMAGE') && <span className="text-lg animate-pulse">📷</span>}
                        {types.includes('VIDEO') && <span className="text-lg animate-pulse">🎥</span>}
                        {types.includes('AUDIO') && <span className="text-lg animate-pulse">🎵</span>}
                      </div>
                    )
                  }
                }
                return null
              }}
              className="rounded-xl overflow-hidden shadow-inner"
            />
          </div>
        </motion.div>



        {modalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200/50 dark:border-gray-700/50"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Add {modalType === "TEXT" ? "Text" : modalType === "IMAGE" ? "Image" : modalType === "VIDEO" ? "Video" : "Audio"} Moment
              </h2>
              <form onSubmit={handleAddMoment}>
                {modalType === "TEXT" ? (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-6 transition-all duration-200"
                    rows={4}
                  />
                ) : (
                  <div className="space-y-6 mb-6">
                    <div className="flex space-x-3">
                      <motion.button
                        type="button"
                        onClick={() => {
                          setShowMedia(true)
                          startCamera()
                        }}
                        className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {modalType === "IMAGE" ? "📷 Take Photo" : modalType === "VIDEO" ? "🎥 Record Video" : "🎵 Record Audio"}
                      </motion.button>
                      <input
                        type="file"
                        accept={modalType === "IMAGE" ? "image/*" : modalType === "VIDEO" ? "video/*" : "audio/*"}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all duration-200"
                      />
                    </div>
                    {showMedia && stream && (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {(modalType === "IMAGE" || modalType === "VIDEO") && (
                          <video
                            autoPlay
                            muted
                            ref={(video) => {
                              if (video && stream) {
                                video.srcObject = stream
                              }
                            }}
                            className="w-full h-48 bg-black rounded-xl shadow-inner"
                          />
                        )}
                        {modalType === "IMAGE" && (
                          <motion.button
                            type="button"
                            onClick={captureImage}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            📸 Capture
                          </motion.button>
                        )}
                        {(modalType === "VIDEO" || modalType === "AUDIO") && (
                          <div className="flex space-x-3">
                            {!recording ? (
                              <motion.button
                                type="button"
                                onClick={startRecording}
                                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                🔴 Start Recording
                              </motion.button>
                            ) : (
                              <motion.button
                                type="button"
                                onClick={stopRecording}
                                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                ⏹️ Stop Recording
                              </motion.button>
                            )}
                          </div>
                        )}
                        <motion.button
                          type="button"
                          onClick={() => {
                            stopCamera()
                            setShowMedia(false)
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          ❌ Cancel
                        </motion.button>
                      </motion.div>
                    )}
                    {file && (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Selected: {file.name}
                        </div>
                        {modalType === "IMAGE" && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-xl shadow-md"
                          />
                        )}
                        {modalType === "VIDEO" && (
                          <video
                            src={URL.createObjectURL(file)}
                            controls
                            className="w-full h-32 object-cover rounded-xl shadow-md"
                          />
                        )}
                        {modalType === "AUDIO" && (
                          <audio
                            src={URL.createObjectURL(file)}
                            controls
                            className="w-full"
                          />
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all duration-200"
                    required
                  />
                </div>
                {error && <div className="text-red-500 mb-6 text-center font-medium">{error}</div>}
                <div className="flex space-x-3">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {loading ? "⏳ Adding..." : "✅ Add Moment"}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setModalOpen(false)
                      setContent("")
                      setFile(null)
                      setShowMedia(false)
                      setError("")
                      stopCamera()
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ❌ Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {dateModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDateModalOpen(false)}
          >
            <motion.div
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Moments for {selectedDateMoments.length > 0 ? new Date(selectedDateMoments[0].createdAt).toDateString() : ""}
                </h2>
                <motion.button
                  onClick={() => setDateModalOpen(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✕
                </motion.button>
              </div>
              {selectedDateMoments.length > 0 ? (
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
                  {selectedDateMoments.map((moment, index) => (
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
                            onClick={() => {
                              setEditingMoment(moment)
                              setEditModalOpen(true)
                            }}
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
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    No moments found for this date.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {editModalOpen && editingMoment && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200/50 dark:border-gray-700/50"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edit {editingMoment.type === "TEXT" ? "Text" : editingMoment.type === "IMAGE" ? "Image" : editingMoment.type === "VIDEO" ? "Video" : "Audio"} Moment
              </h2>
              <form onSubmit={handleEditMoment}>
                {editingMoment.type === "TEXT" ? (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-6 transition-all duration-200"
                    rows={4}
                  />
                ) : (
                  <div className="space-y-6 mb-6">
                    <div className="flex space-x-3">
                      <motion.button
                        type="button"
                        onClick={() => {
                          setShowMedia(true)
                          startCamera()
                        }}
                        className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {editingMoment.type === "IMAGE" ? "📷 Take Photo" : editingMoment.type === "VIDEO" ? "🎥 Record Video" : "🎵 Record Audio"}
                      </motion.button>
                      <input
                        type="file"
                        accept={editingMoment.type === "IMAGE" ? "image/*" : editingMoment.type === "VIDEO" ? "video/*" : "audio/*"}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all duration-200"
                      />
                    </div>
                    {showMedia && stream && (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {(editingMoment.type === "IMAGE" || editingMoment.type === "VIDEO") && (
                          <video
                            autoPlay
                            muted
                            ref={(video) => {
                              if (video && stream) {
                                video.srcObject = stream
                              }
                            }}
                            className="w-full h-48 bg-black rounded-xl shadow-inner"
                          />
                        )}
                        {editingMoment.type === "IMAGE" && (
                          <motion.button
                            type="button"
                            onClick={captureImage}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            📸 Capture
                          </motion.button>
                        )}
                        {(editingMoment.type === "VIDEO" || editingMoment.type === "AUDIO") && (
                          <div className="flex space-x-3">
                            {!recording ? (
                              <motion.button
                                type="button"
                                onClick={startRecording}
                                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                🔴 Start Recording
                              </motion.button>
                            ) : (
                              <motion.button
                                type="button"
                                onClick={stopRecording}
                                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                ⏹️ Stop Recording
                              </motion.button>
                            )}
                          </div>
                        )}
                        <motion.button
                          type="button"
                          onClick={() => {
                            stopCamera()
                            setShowMedia(false)
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          ❌ Cancel
                        </motion.button>
                      </motion.div>
                    )}
                    {file && (
                      <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          Selected: {file.name}
                        </div>
                        {editingMoment.type === "IMAGE" && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-xl shadow-md"
                          />
                        )}
                        {editingMoment.type === "VIDEO" && (
                          <video
                            src={URL.createObjectURL(file)}
                            controls
                            className="w-full h-32 object-cover rounded-xl shadow-md"
                          />
                        )}
                        {editingMoment.type === "AUDIO" && (
                          <audio
                            src={URL.createObjectURL(file)}
                            controls
                            className="w-full"
                          />
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all duration-200"
                    required
                  />
                </div>
                {error && <div className="text-red-500 mb-6 text-center font-medium">{error}</div>}
                <div className="flex space-x-3">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {loading ? "⏳ Updating..." : "✅ Update Moment"}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false)
                      setEditingMoment(null)
                      setContent("")
                      setFile(null)
                      setShowMedia(false)
                      setError("")
                      stopCamera()
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ❌ Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
