import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const VALID_LAYOUTS = ['centered', 'vertical', 'vertical_horizontal']

function validateLayoutType(layoutType: string): string {
  if (VALID_LAYOUTS.includes(layoutType)) {
    return layoutType
  }
  return 'centered'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const layoutType = validateLayoutType(searchParams.get('type') || 'centered')

    // Map layout types to file names
    const fileMap: Record<string, string> = {
      centered: 'orgchart-center.html',
      vertical: 'orgchart-vertical.html',
      vertical_horizontal: 'orgchart-horizontal.html',
    }

    const fileName = fileMap[layoutType] || 'orgchart-center.html'
    const filePath = join(process.cwd(), 'public', fileName)

    try {
      const content = await readFile(filePath, 'utf-8')
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    } catch (error) {
      return NextResponse.json(
        { error: `No sample file found for ${layoutType} layout.` },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Sample error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

