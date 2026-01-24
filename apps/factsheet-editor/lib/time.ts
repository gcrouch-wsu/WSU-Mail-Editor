const PACIFIC_TIMEZONE = 'America/Los_Angeles'

type DateParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function getPacificParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const partMap: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = part.value
    }
  }
  return {
    year: partMap.year,
    month: partMap.month,
    day: partMap.day,
    hour: partMap.hour,
    minute: partMap.minute,
  }
}

export function formatPacificDateTime(date: Date): string {
  const { year, month, day, hour, minute } = getPacificParts(date)
  return `${year}-${month}-${day} ${hour}:${minute}`
}

export function formatPacificTimestamp(date: Date): string {
  const { year, month, day, hour, minute } = getPacificParts(date)
  return `${year}${month}${day}_${hour}${minute}`
}
