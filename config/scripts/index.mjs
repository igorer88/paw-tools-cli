import fs from 'node:fs'

import {
  askQuestion,
  askYesNoQuestion,
  installDependencies,
  getGitAuthor,
  isPackageManagerInstalled,
  rl
} from './utils.mjs'
import { updatePackageJson, updateDockerCompose } from './updatePackage.mjs'

/**
 * Main function to prompt the user for package details and update the package.json file and docker compose file.
 */
const main = async () => {
  let packageManager = 'pnpm'
  try {
    const gitAuthor = await getGitAuthor()
    const name = await askQuestion('Enter project name', '')
    const description = await askQuestion('Enter project description', '')
    const version = await askQuestion('Enter project version', '1.0.0')
    const author = await askQuestion('Enter project author', gitAuthor)

    await updatePackageJson({ name, description, version, author })
    const dockerComposePath = await askQuestion(
      'Enter docker-compose file path',
      './docker-compose.yml'
    )

    if (!fs.existsSync(dockerComposePath)) {
      console.error(`Error: ${dockerComposePath} does not exist.`)
      return
    }

    const serviceName = await askQuestion('Enter Docker service name', 'api')
    const dockerImageVersion = await askQuestion(
      'Enter Docker image version',
      'latest'
    )

    const shouldInstallDependencies = await askYesNoQuestion(
      'Do you want to install dependencies now?'
    )

    let registryUrl = 'https://registry.npmjs.org/'

    if (shouldInstallDependencies) {
      packageManager = await askQuestion(
        'Enter package manager (pnpm/npm/yarn)',
        'pnpm (Recommended)'
      )
      const isInstalled = await isPackageManagerInstalled(packageManager)
      if (!isInstalled) {
        console.error(`Error: ${packageManager} is not installed.`)
        return
      }

      registryUrl = await askQuestion('Enter registry URL', registryUrl)
    }

    updateDockerCompose(
      serviceName,
      name,
      dockerComposePath,
      dockerImageVersion,
      packageManager,
      registryUrl
    )

    if (shouldInstallDependencies) {
      await installDependencies(packageManager)
      console.log(
        `\nTo run the NestJS project, use: ${packageManager} run start:dev or ${packageManager} start:dev `
      )
    }
    console.log('\nReady to go!\nHappy Coding! 🚀')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    rl.close()
  }
}

main()
