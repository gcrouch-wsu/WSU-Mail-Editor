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

    // All layouts use the same unified Wordpress.js
    const fileName = 'Wordpress.js'
    const filePath = join(process.cwd(), 'public', fileName)

    try {
      const content = await readFile(filePath, 'utf-8')
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    } catch (error) {
      return NextResponse.json(
        { error: `Runtime JS not found for ${layoutType} layout.` },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Runtime error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

