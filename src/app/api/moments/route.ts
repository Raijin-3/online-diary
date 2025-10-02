import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const moments = await prisma.moment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  })

  return NextResponse.json({ moments })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""

  let type: string
  let content: string
  let createdAt: Date

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    type = formData.get("type") as string
    const file = formData.get("file") as File | null
    const textContent = formData.get("content") as string
    const dateStr = formData.get("date") as string

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 })
    }

    // Validate date
    if (dateStr) {
      createdAt = new Date(dateStr)
      if (isNaN(createdAt.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
      }
      // Check if date is in the future
      const now = new Date()
      if (createdAt > now) {
        return NextResponse.json({ error: "Cannot add moments to future dates" }, { status: 400 })
      }
    } else {
      createdAt = new Date()
    }

    if (type === "TEXT") {
      if (!textContent) {
        return NextResponse.json({ error: "Content is required for text" }, { status: 400 })
      }
      content = textContent
    } else {
      if (!file) {
        return NextResponse.json({ error: "File is required" }, { status: 400 })
      }
      try {
        // Save file
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true })
        }
        const filename = `${Date.now()}-${file.name}`
        const filepath = path.join(uploadDir, filename)
        const buffer = Buffer.from(await file.arrayBuffer())
        fs.writeFileSync(filepath, buffer)
        content = `/uploads/${filename}`
      } catch (error) {
        console.error("Error saving file:", error)
        return NextResponse.json({ error: "Failed to save file" }, { status: 500 })
      }
    }
  } else {
    const { type: t, content: c, date: d } = await request.json()
    type = t
    content = c

    if (!type || !content) {
      return NextResponse.json({ error: "Type and content are required" }, { status: 400 })
    }

    // Validate date
    if (d) {
      createdAt = new Date(d)
      if (isNaN(createdAt.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
      }
      // Check if date is in the future
      const now = new Date()
      if (createdAt > now) {
        return NextResponse.json({ error: "Cannot add moments to future dates" }, { status: 400 })
      }
    } else {
      createdAt = new Date()
    }
  }

  const moment = await prisma.moment.create({
    data: {
      userId: session.user.id,
      type: type as "TEXT" | "IMAGE" | "VIDEO" | "AUDIO",
      content,
      createdAt,
    }
  })

  return NextResponse.json({ moment })
}
