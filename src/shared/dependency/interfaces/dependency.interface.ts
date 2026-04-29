export interface Dependency {
  name: string
  version?: string
  command?: string
  isRequired?: boolean
  description?: string
}

export interface MissingDependency {
  name: string
  requiredVersion: string | null
  installedVersion: string | null
  installedPath: string | null
  isMet: boolean
}

export interface DependencyWarning {
  name: string
  installedVersion: string | null
  requiredVersion: string | null
  installedPath: string | null
}

export interface DependencyResult {
  missing: MissingDependency[]
  warnings: DependencyWarning[]
}

export interface DependencyServiceCheck {
  check(dependencies: Dependency[]): Promise<DependencyResult>
}
