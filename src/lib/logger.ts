import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const LOG_DIR = join(process.cwd(), 'logs')

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
}

export function writeLog(source: 'worker' | 'scheduler', message: string) {
  ensureLogDir()
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}\n`
  const filePath = join(LOG_DIR, `${source}.log`)

  try {
    appendFileSync(filePath, line)
  } catch {
    // Silently fail if we can't write logs
  }
}

export function readLogs(source: 'worker' | 'scheduler', lines = 100): string[] {
  const filePath = join(LOG_DIR, `${source}.log`)

  if (!existsSync(filePath)) {
    return []
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const allLines = content.split('\n').filter(Boolean)
    return allLines.slice(-lines)
  } catch {
    return []
  }
}
