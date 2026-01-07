import { NextRequest, NextResponse } from 'next/server'

interface TranslationRow {
  Input: string
  Output: string
}

function parseTxtContent(content: string): TranslationRow[] {
  /**
   * Parses the raw text content using a strict anchor-based approach.
   * - Input anchor: Line must be exactly 'Input'.
   * - Output anchor: Line must start with 'Output' but not be 'Output Type'.
   */
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const inputs: string[] = []
  const outputs: string[] = []

  // We start from 1 because we need a preceding line (i-1)
  for (let i = 1; i < lines.length; i++) {
    const lineClean = lines[i]

    // Strict Input Anchor: exactly "Input"
    if (lineClean === 'Input') {
      inputs.push(lines[i - 1])
    }
    // Strict Output Anchor: Starts with "Output", excludes headers like "Output Type"
    else if (lineClean.startsWith('Output') && lineClean !== 'Output Type') {
      outputs.push(lines[i - 1])
    }
  }

  // Pair them up
  const minLen = Math.min(inputs.length, outputs.length)
  const pairedInputs = inputs.slice(0, minLen)
  const pairedOutputs = outputs.slice(0, minLen)

  const data: TranslationRow[] = []
  for (let i = 0; i < minLen; i++) {
    data.push({ Input: pairedInputs[i], Output: pairedOutputs[i] })
  }

  return data
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      )
    }

    const data = parseTxtContent(body.text)
    const filename = 'pasted_data.txt'

    return NextResponse.json({ data, filename })
  } catch (error) {
    console.error('Error processing text:', error)
    return NextResponse.json(
      { error: 'Invalid request format. JSON expected.' },
      { status: 400 }
    )
  }
}

