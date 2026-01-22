import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'factsheet.js')
    const content = await readFile(filePath, 'utf-8')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Serve JS error:', error)
    return NextResponse.json(
      { error: 'Failed to serve factsheet.js' },
      { status: 500 }
    )
  }
}
