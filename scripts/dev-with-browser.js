// scripts/dev-with-browser.js - Start Next.js dev server and open browser automatically

const { spawn } = require('child_process')
const { exec } = require('child_process')
const os = require('os')

const platform = os.platform()
const url = 'http://localhost:3000'

// Start Next.js dev server
console.log('Starting Next.js development server...')
const devServer = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
})

// Wait for server to start, then open browser
setTimeout(() => {
  console.log(`Opening ${url} in your default browser...`)
  
  if (platform === 'win32') {
    // Windows: Use PowerShell to open in external browser (not Cursor's embedded browser)
    exec(`powershell -Command "Start-Process '${url}'"`, (error) => {
      if (error) {
        console.error('Failed to open browser:', error)
      }
    })
  } else if (platform === 'darwin') {
    // macOS
    exec(`open ${url}`, (error) => {
      if (error) {
        console.error('Failed to open browser:', error)
      }
    })
  } else {
    // Linux
    exec(`xdg-open ${url}`, (error) => {
      if (error) {
        console.error('Failed to open browser:', error)
      }
    })
  }
}, 3000) // Wait 3 seconds for server to start

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

