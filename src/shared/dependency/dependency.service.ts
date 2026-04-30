import { Injectable } from '@nestjs/common'

import { ProcessService } from '@/shared/process'
import { validateCalver, validateSemver } from '@/shared/utils.helper'
import type {
  Dependency,
  DependencyResult,
  DependencyServiceCheck,
  DependencyWarning,
  MissingDependency
} from './interfaces'

@Injectable()
export class DependencyService implements DependencyServiceCheck {
  private readonly process: ProcessService

  constructor(process: ProcessService) {
    this.process = process
  }

  which(command: string): string | null {
    return this.process.which(command)
  }

  private compareVersions(installed: string | null, required: string): boolean {
    if (!installed) return false

    // Validate installed version format using utils.helper
    const semverError = validateSemver(installed)
    const calverError = validateCalver(installed)

    // Extract base version from requirement (remove >=, ^, ~ prefixes)
    const requiredClean = required.replace(/^[>=^~]+/, '').trim()

    // Determine format - check calver first since it's more specific (4-digit year)
    const isCalver = !calverError
    const isSemver = !semverError && !isCalver // Only treat as semver if not calver

    // Compare based on detected format
    if (isCalver) {
      // Installed is calver - validate that required is also a valid calver
      const requiredCalverError = validateCalver(requiredClean)
      const requiredIsCalver = !requiredCalverError

      if (!requiredIsCalver) {
        // Mismatched formats - calver installed but semver (or other) required
        return false
      }

      // Installed is calver and required is also calver
      if (required.startsWith('>=')) {
        const minVersion = requiredClean
        return this.satisfiesGteCalver(installed, minVersion)
      }
      // For calver, ^ and ~ don't make sense in the same way, fall back to exact match
      // But we need to compare without the prefix
      return installed === requiredClean
    } else if (isSemver) {
      // Installed is semver - validate that required base is also semver-compatible
      const requiredSemverError = validateSemver(requiredClean)
      const requiredIsSemver = !requiredSemverError

      if (!requiredIsSemver) {
        // Mismatched formats - semver installed but calver (or other) required
        return false
      }

      // Installed is semver and required is also semver
      if (required.startsWith('>=')) {
        const minVersion = requiredClean
        return this.satisfiesGte(installed, minVersion)
      }
      if (required.startsWith('^')) {
        const major = requiredClean
        return installed.startsWith(`${major.split('.')[0]}.`)
      }
      if (required.startsWith('~')) {
        const minVersion = requiredClean
        const [major, minor] = minVersion.split('.')
        return installed.startsWith(`${major}.${minor}.`)
      }
      return installed === requiredClean
    } else {
      // Installed version is neither semver nor calver
      return false
    }
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

  private satisfiesGteCalver(installed: string, minVersion: string): boolean {
    // Calver format: YYYY.M.PATCH (or YYYY.MM.DD but we use M.PATCH for flexibility)
    const [iYear, iMonth, iPatch] = installed.split('.').map(Number)
    const [mYear, mMonth, mPatch] = minVersion.split('.').map(Number)

    if (iYear > mYear) return true
    if (iYear < mYear) return false
    if (iMonth > mMonth) return true
    if (iMonth < mMonth) return false
    return iPatch >= mPatch
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
