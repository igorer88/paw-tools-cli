import crypto from 'node:crypto'

const _secretKey = crypto.randomBytes(32).toString('hex')
