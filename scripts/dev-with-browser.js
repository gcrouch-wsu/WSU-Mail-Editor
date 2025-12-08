/**
 * Development server launcher with automatic browser opening.
 *
 * This script:
 * 1. Kills any existing Next.js dev servers on ports 3000-3010
 * 2. Starts the Next.js development server
 * 3. Detects which port Next.js actually uses (3000, 3001, etc.)
 * 4. Opens that port in the default browser
 *
 * Platform-specific browser opening:
 * - Windows: Uses PowerShell Start-Process to open in external browser (not IDE embedded browser)
 * - macOS: Uses 'open' command
 * - Linux: Uses 'xdg-open' command
 *
 * IMPORTANT: Always kill dev server processes after testing to free up ports.
 * See AI_HANDOFF.md "Development Workflow & Best Practices" section.
 */

const { spawn } = require('child_process')
const { exec } = require('child_process')
const os = require('os')

const platform = os.platform()
let detectedPort = null

// Function to kill processes on a specific port (Windows)
function killPortWindows(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve() // No process on this port
        return
      }

      // Extract PIDs from netstat output
      const lines = stdout.split('\n')
      const pids = new Set()

      lines.forEach(line => {
        const match = line.match(/LISTENING\s+(\d+)/)
        if (match) {
          pids.add(match[1])
        }
      })

      if (pids.size === 0) {
        resolve()
        return
      }

      // Kill each PID
      const killPromises = Array.from(pids).map(pid => {
        return new Promise((res) => {
          exec(`taskkill /PID ${pid} /F`, () => res())
        })
      })

      Promise.all(killPromises).then(resolve)
    })
  })
}

// Function to kill processes on a specific port (Unix)
function killPortUnix(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve() // No process on this port
        return
      }

      const pids = stdout.trim().split('\n')
      const killPromises = pids.map(pid => {
        return new Promise((res) => {
          exec(`kill -9 ${pid}`, () => res())
        })
      })

      Promise.all(killPromises).then(resolve)
    })
  })
}

// Kill old dev servers on common ports
async function killOldServers() {
  console.log('Checking for existing dev servers on ports 3000-3010...')
  const killPort = platform === 'win32' ? killPortWindows : killPortUnix

  const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010]
  await Promise.all(ports.map(port => killPort(port)))

  console.log('✓ Cleared existing dev servers')
}

// Function to open browser
function openBrowser(url) {
  console.log(`Opening ${url} in your default browser...`)

  if (platform === 'win32') {
    // Windows: Use PowerShell to open in external browser
    exec(`powershell -Command "Start-Process '${url}'"`, (error) => {
      if (error) {
        console.error('Failed to open browser:', error)
      }
    })
  } else if (platform === 'darwin') {
    // macOS: Use 'open' command
    exec(`open ${url}`, (error) => {
      if (error) {
        console.error('Failed to open browser:', error)
      }
    })
  } else {
    // Linux: Use 'xdg-open' command
    exec(`xdg-open ${url}`, (error) => {
      if (error) {
        console.error('Failed to open browser:', error)
      }
    })
  }
}

// Start dev server after killing old ones
killOldServers().then(() => {
  console.log('Starting Next.js development server...')

  const devServer = spawn('npx', ['next', 'dev'], {
    shell: true,
  })

  // Capture stdout to detect the actual port
  let serverReady = false

  devServer.stdout.on('data', (data) => {
    const output = data.toString()
    process.stdout.write(output)

    // Detect port from Next.js output: "Local:        http://localhost:3001"
    const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/)
    if (portMatch && !detectedPort) {
      detectedPort = portMatch[1]
      console.log(`✓ Detected server running on port ${detectedPort}`)
    }

    // Detect when server is ready
    if (output.includes('Ready in') && !serverReady) {
      serverReady = true
      const url = `http://localhost:${detectedPort || 3000}`
      setTimeout(() => openBrowser(url), 500)
    }
  })

  devServer.stderr.on('data', (data) => {
    process.stderr.write(data)
  })

  // Handle server process exit
  devServer.on('exit', (code) => {
    console.log('Dev server exited')
    process.exit(code)
  })

  // Handle Ctrl+C - properly kill the dev server and its child processes
  process.on('SIGINT', () => {
    console.log('\nShutting down dev server...')
    if (platform === 'win32') {
      // Windows: Kill the process tree
      devServer.kill('SIGTERM')
      // Give it a moment, then force kill if needed
      setTimeout(() => {
        if (!devServer.killed) {
          devServer.kill('SIGKILL')
        }
        process.exit(0)
      }, 1000)
    } else {
      devServer.kill('SIGINT')
      process.exit(0)
    }
  })

  process.on('SIGTERM', () => {
    console.log('Shutting down dev server...')
    devServer.kill('SIGTERM')
    setTimeout(() => {
      if (!devServer.killed) {
        devServer.kill('SIGKILL')
      }
      process.exit(0)
    }, 1000)
  })

  // Handle uncaught errors
  devServer.on('error', (error) => {
    console.error('Dev server error:', error)
    process.exit(1)
  })
})

