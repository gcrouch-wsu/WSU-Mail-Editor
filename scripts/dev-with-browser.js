// scripts/dev-with-browser.js - Start dev server and open browser
const { spawn } = require('child_process')
const { exec } = require('child_process')

// Start Next.js dev server
const nextDev = spawn('next', ['dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
})

// Wait a bit for server to start, then open browser
setTimeout(() => {
  const url = 'http://localhost:3000'
  const platform = process.platform

  let command
  if (platform === 'win32') {
    // Windows - Use PowerShell Start-Process to force opening in external browser window
    // This ensures it opens outside of Cursor's embedded browser
    command = `powershell -Command "Start-Process '${url}'"`
  } else if (platform === 'darwin') {
    // macOS
    command = `open ${url}`
  } else {
    // Linux
    command = `xdg-open ${url}`
  }

  exec(command, (error) => {
    if (error) {
      console.log(`Could not automatically open browser. Please navigate to ${url}`)
      console.log(`Error: ${error.message}`)
    } else {
      console.log(`Opening browser at ${url} in external window`)
    }
  })
}, 3000) // Wait 3 seconds for server to start

// Handle process termination
process.on('SIGINT', () => {
  nextDev.kill('SIGINT')
  process.exit()
})

process.on('SIGTERM', () => {
  nextDev.kill('SIGTERM')
  process.exit()
})

