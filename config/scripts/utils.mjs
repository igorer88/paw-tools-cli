import readline from 'node:readline'
import { exec } from 'node:child_process'
import fs from 'node:fs'

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 * Prompts the user with a question and returns their input.
 * If the user provides no input, the current value is returned.
 *
 * @param {string} query - The question to ask the user.
 * @param {string} currentValue - The current value to use if the user provides no input.
 * @returns {Promise<string>} - The user's input or the current value.
 */
export const askQuestion = (query, currentValue) =>
  new Promise(resolve => {
    rl.question(`${query} (current: ${currentValue}): `, answer => {
      resolve(answer.trim() === '' ? currentValue : answer)
    })
  })

/**
 * Prompts the user with a yes/no question and returns their response.
 *
 * @param {string} query - The yes/no question to ask the user.
 * @returns {Promise<boolean>} - True if the user answers 'y', false otherwise.
 */
export const askYesNoQuestion = query =>
  new Promise(resolve => {
    rl.question(`${query} (y/n): `, answer => {
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })

/**
 * Retrieves the Git author name and email from the local Git configuration.
 *
 * @returns {Promise<string>} - The Git author name and email in the format "Name <email>".
 */
export const getGitAuthor = () =>
  new Promise((resolve, reject) => {
    exec('git config --get user.name', (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      const name = stdout.trim()
      exec('git config --get user.email', (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        const email = stdout.trim()
        resolve(`${name} <${email}>`)
      })
    })
  })

/**
 * Checks if the specified package manager is installed.
 *
 * @param {string} packageManager - The package manager to check (e.g., 'pnpm', 'npm', 'yarn').
 * @returns {Promise<boolean>} - True if the package manager is installed, false otherwise.
 */
export const isPackageManagerInstalled = packageManager => {
  return new Promise(resolve => {
    exec(`${packageManager} --version`, error => {
      resolve(!error)
    })
  })
}

/**
 * Installs project dependencies using the specified package manager.
 * Removes pnpm-lock.yaml if the package manager is not 'pnpm'.
 *
 * @param {string} packageManager - The package manager to use for installing dependencies (e.g., 'pnpm', 'npm', 'yarn').
 * @returns {Promise<string>} - The package manager used.
 */
export const installDependencies = (packageManager = 'pnpm') => {
  const command = `${packageManager} install`

  return new Promise((resolve, reject) => {
    if (packageManager !== 'pnpm' && fs.existsSync('pnpm-lock.yaml')) {
      fs.unlinkSync('pnpm-lock.yaml')
      console.log('Removed pnpm-lock.yaml')
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing dependencies: ${error.message}`)
        reject(error)
        return
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`)
        reject(new Error(stderr))
        return
      }
      console.log(`stdout: ${stdout}`)
      resolve(packageManager)
    })
  })
}
