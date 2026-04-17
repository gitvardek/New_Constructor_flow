import test from 'node:test'
import assert from 'node:assert/strict'

import { createApiClient } from '../transport/client'
import { ApiClientError } from '../transport/api-client-error'
import { getHealth } from '../health/health'

test('health client calls the health endpoint and returns the response', async () => {
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []

  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async (input, init) => {
      fetchCalls.push({ input, init })

      return new Response(
        JSON.stringify({
          status: 'ok',
          version: '1.0.0',
          timestamp: '2026-03-30T10:00:00.000Z',
          services: {
            api: { status: 'ok' },
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    },
  })

  const result = await getHealth(apiClient)

  assert.equal(fetchCalls.length, 1)
  const request = fetchCalls[0]?.input
  assert.ok(request instanceof Request)
  assert.equal(request.url, 'http://localhost:3000/health')
  assert.equal(request.method, 'GET')
  assert.equal(result.status, 'ok')
  assert.equal(result.services.api?.status, 'ok')
})

test('health client works with a client created by createApiClient', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response(
        JSON.stringify({
          status: 'ok',
          version: '1.0.0',
          timestamp: '2026-03-30T10:00:00.000Z',
          services: {
            api: { status: 'ok' },
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      ),
  })

  const result = await getHealth(apiClient)

  assert.equal(result.status, 'ok')
  assert.equal(result.services.api?.status, 'ok')
})

test('health client prefers backend error payload when the request fails', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response(
        JSON.stringify({
          errorCode: 'UNAVAILABLE',
          message: 'Health endpoint is unavailable.',
          statusCode: 503,
        }),
        {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }
      ),
  })

  await assert.rejects(
    () => getHealth(apiClient),
    (error: unknown) => {
      assert.ok(error instanceof ApiClientError)
      assert.equal(error.message, 'Health endpoint is unavailable.')
      assert.equal(error.errorCode, 'UNAVAILABLE')
      assert.equal(error.statusCode, 503)
      return true
    }
  )
})

test('health client throws when the transport returns no data', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response('null', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  })

  await assert.rejects(
    () => getHealth(apiClient),
    (error: unknown) => {
      assert.ok(error instanceof ApiClientError)
      assert.equal(error.message, 'API request returned no data.')
      return true
    }
  )
})
