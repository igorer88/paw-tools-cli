import { ConflictException, Injectable } from '@nestjs/common'

@Injectable()
export class DBErrorsService {
  public checkConstraintsErrors(error: {
    constraint: string
    detail: string
  }): void {
    switch (error.constraint) {
      case '':
        throw new ConflictException('Entity already exists', {
          cause: error.detail,
          description: 'Error while checking entity constraints'
        })

      default:
        break
    }
  }
}
