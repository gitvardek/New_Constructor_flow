import test from 'node:test'
import assert from 'node:assert/strict'

import { ApiClientError } from '../transport/api-client-error'
import { toApiClientError } from '../transport/to-api-client-error'

test('toApiClientError preserves ApiError contract fields', () => {
  const error = toApiClientError({
    statusCode: 401,
    errorCode: 'UNAUTHORIZED',
    message: 'Session is missing or expired.',
    details: { reason: 'expired' },
  })

  assert.ok(error instanceof ApiClientError)
  assert.equal(error.message, 'Session is missing or expired.')
  assert.equal(error.statusCode, 401)
  assert.equal(error.errorCode, 'UNAUTHORIZED')
  assert.deepEqual(error.details, { reason: 'expired' })
})

test('toApiClientError falls back when payload does not match the ApiError contract', () => {
  const error = toApiClientError({
    errorCode: 'UNAVAILABLE',
    message: 'Missing status code.',
  })

  assert.ok(error instanceof ApiClientError)
  assert.equal(error.message, 'API request failed.')
  assert.equal(error.statusCode, undefined)
  assert.equal(error.errorCode, undefined)
})
