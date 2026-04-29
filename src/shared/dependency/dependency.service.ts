import { Injectable } from '@nestjs/common'

import { ProcessService } from '@/shared/process'
import type {
  Dependency,
  DependencyResult,
  DependencyServiceCheck,
  DependencyWarning,
  MissingDependency
} from './interfaces'

@Injectable()
export class DependencyService implements DependencyServiceCheck {
  constructor(private readonly process: ProcessService) {}

  which(command: string): string | null {
    return this.process.which(command)
  }

  private compareVersions(installed: string | null, required: string): boolean {
    if (!installed) return false

    if (required.startsWith('>=')) {
      const minVersion = required.slice(2).trim()
      return this.satisfiesGte(installed, minVersion)
    }
    if (required.startsWith('^')) {
      const major = required.slice(1).trim()
      return installed.startsWith(`${major.split('.')[0]}.`)
    }
    if (required.startsWith('~')) {
      const minVersion = required.slice(1).trim()
      const [major, minor] = minVersion.split('.')
      return installed.startsWith(`${major}.${minor}.`)
    }
    return installed === required
  }

  private satisfiesGte(installed: string, minVersion: string): boolean {
    const [i1, i2, i3] = installed.split('.').map(Number)
    const [m1, m2, m3] = minVersion.split('.').map(Number)

    if (i1 > m1) return true
    if (i1 < m1) return false
    if (i2 > m2) return true
    if (i2 < m2) return false
    return i3 >= m3
  }

  async check(dependencies: Dependency[]): Promise<DependencyResult> {
    const missing: MissingDependency[] = []
    const warnings: DependencyWarning[] = []

    for (const dep of dependencies) {
      const command = dep.command || dep.name
      const installedPath = this.process.which(command)

      if (!installedPath) {
        if (dep.isRequired !== false) {
          missing.push({
            name: dep.name,
            requiredVersion: dep.version || null,
            installedVersion: null,
            installedPath: null,
            isMet: false
          })
        }
        continue
      }

      const installedVersion = await this.process.getVersion(command)
      const isMet = dep.version ? this.compareVersions(installedVersion, dep.version) : true

      if (!isMet) {
        warnings.push({
          name: dep.name,
          installedVersion: installedVersion || null,
          requiredVersion: dep.version || null,
          installedPath
        })
      }
    }

    return { missing, warnings }
  }
}
