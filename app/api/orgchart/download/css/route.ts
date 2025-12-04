import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(_request: NextRequest) {
  try {
    const filePath = join(process.cwd(), 'public', 'Wordpress.css')
    const content = await readFile(filePath, 'utf-8')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/css',
        'Content-Disposition': 'attachment; filename="Wordpress.css"',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Download CSS error:', error)
    return NextResponse.json(
      { error: 'Failed to download Wordpress.css' },
      { status: 500 }
    )
  }
}

