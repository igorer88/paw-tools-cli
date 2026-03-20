import fs from 'node:fs'
import yaml from 'yaml'

/**
 * Updates the package.json file with provided values.
 * Optionally installs dependencies after updating the package.json file.
 *
 * @param {Object} params - The parameters for updating package.json.
 * @param {string} params.name - The project name.
 * @param {string} params.description - The project description.
 * @param {string} params.version - The project version.
 * @param {string} params.author - The project author.
 */
export const updatePackageJson = async ({
  name,
  description,
  version,
  author
}) => {
  try {
    const packageJsonPath = './package.json'
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    packageJson.name = name || packageJson.name
    packageJson.description = description || packageJson.description
    packageJson.version = version || packageJson.version
    packageJson.author = author || packageJson.author
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n'
    )
    console.log('Updated package.json successfully!\n')
  } catch (error) {
    console.error(`Error updating package.json: ${error.message}`)
  }
}

/**
 * Updates the docker-compose.yml file with the provided service name and image version.
 * Optionally changes the PNPM_REGISTRY to the specified package manager registry.
 *
 * @param {string} serviceName - The name of the service to update.
 * @param {string} name - The project name.
 * @param {string} [dockerComposePath='./docker-compose.yml'] - The path to the docker-compose.yml file.
 * @param {string} [dockerImageVersion='latest'] - The version of the Docker image.
 * @param {string} [packageManager='pnpm'] - The package manager to use for the registry.
 * @param {string} [registryUrl='https://registry.npmjs.org/'] - The registry URL to use.
 */
export const updateDockerCompose = (
  serviceName,
  name,
  dockerComposePath = './docker-compose.yml',
  dockerImageVersion = 'latest',
  packageManager = 'pnpm',
  registryUrl = 'https://registry.npmjs.org/'
) => {
  try {
    const fileContents = fs.readFileSync(dockerComposePath, 'utf8')
    const composeFile = yaml.parseDocument(fileContents)

    const services = composeFile.get('services')
    if (services && services.has('api')) {
      const service = services.get('api')
      const dockerImgVersion = `${name}:${dockerImageVersion}`
      console.log(
        `Updating docker-compose.yml for service: ${serviceName} with image: ${dockerImgVersion}`
      )
      service.set('container_name', name)
      service.set('image', dockerImgVersion)
      services.delete('api')
      services.set(serviceName, service)

      if (service?.has('build') && service.get('build').has('args')) {
        const args = service.getIn(['build', 'args'])
        const registryArg = `${packageManager.toUpperCase()}_REGISTRY`
        // Clean up old registry args
        args.delete('NPM_REGISTRY')
        args.delete('YARN_REGISTRY')
        args.delete('PNPM_REGISTRY')
        // Set the correct one
        args.set(registryArg, registryUrl)
      }
    }

    // Clean up empty top-level keys
    if (composeFile.has('volumes') && composeFile.get('volumes')?.items.length === 0) {
      composeFile.delete('volumes')
    }
    if (composeFile.has('networks') && composeFile.get('networks')?.items.length === 0) {
      composeFile.delete('networks')
    }

    fs.writeFileSync(dockerComposePath, composeFile.toString())
    console.log('Updated docker-compose.yml successfully!')
  } catch (error) {
    console.error(`Error updating ${dockerComposePath}: ${error.message}`)
  }
}
