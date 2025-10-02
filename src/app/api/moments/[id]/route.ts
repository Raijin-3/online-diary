import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Check if moment exists and belongs to user
  const existingMoment = await prisma.moment.findFirst({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!existingMoment) {
    return NextResponse.json({ error: "Moment not found" }, { status: 404 })
  }

  const contentType = request.headers.get("content-type") || ""

  let content: string
  let createdAt: Date | undefined

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const textContent = formData.get("content") as string
    const dateStr = formData.get("date") as string

    // Validate date if provided
    if (dateStr) {
      createdAt = new Date(dateStr)
      if (isNaN(createdAt.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
      }
      // Check if date is in the future
      const now = new Date()
      if (createdAt > now) {
        return NextResponse.json({ error: "Cannot set moments to future dates" }, { status: 400 })
      }
    }

    if (existingMoment.type === "TEXT") {
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

        // Delete old file if it exists
        if (existingMoment.content.startsWith("/uploads/")) {
          const oldFilePath = path.join(process.cwd(), "public", existingMoment.content)
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath)
          }
        }
      } catch (error) {
        console.error("Error saving file:", error)
        return NextResponse.json({ error: "Failed to save file" }, { status: 500 })
      }
    }
  } else {
    const { content: c, date: d } = await request.json()
    content = c

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Validate date if provided
    if (d) {
      createdAt = new Date(d)
      if (isNaN(createdAt.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
      }
      // Check if date is in the future
      const now = new Date()
      if (createdAt > now) {
        return NextResponse.json({ error: "Cannot set moments to future dates" }, { status: 400 })
      }
    }
  }

  const updateData: { content: string; createdAt?: Date } = { content }
  if (createdAt) {
    updateData.createdAt = createdAt
  }

  const moment = await prisma.moment.update({
    where: { id },
    data: updateData
  })

  return NextResponse.json({ moment })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Check if moment exists and belongs to user
  const existingMoment = await prisma.moment.findFirst({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!existingMoment) {
    return NextResponse.json({ error: "Moment not found" }, { status: 404 })
  }

  // Delete file if it exists
  if (existingMoment.content.startsWith("/uploads/")) {
    try {
      const filePath = path.join(process.cwd(), "public", existingMoment.content)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (error) {
      console.error("Error deleting file:", error)
    }
  }

  await prisma.moment.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
