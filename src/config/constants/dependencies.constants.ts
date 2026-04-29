import type { Dependency } from '@/shared/dependency'

export const REQUIRED_DEPENDENCIES: Dependency[] = [
  {
    name: 'git',
    version: '>=2.30',
    description: 'Version control operations'
  }
]

export const OPTIONAL_DEPENDENCIES: Dependency[] = [
  {
    name: 'docker',
    version: '>=24.0',
    isRequired: false,
    description: 'Containerized builds and deployments'
  }
]

export const ALL_DEPENDENCIES = [...REQUIRED_DEPENDENCIES, ...OPTIONAL_DEPENDENCIES]
