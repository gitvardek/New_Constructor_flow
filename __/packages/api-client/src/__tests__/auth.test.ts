import test from 'node:test'
import assert from 'node:assert/strict'

import { createApiClient } from '../transport/client'
import { ApiClientError } from '../transport/api-client-error'
import { createAuthHttpClient } from '../auth/auth'

test('auth client returns the auth session payload', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response(
        JSON.stringify({
          user: {
            id: 'kc-user-1',
            email: 'user@example.com',
            displayName: 'User Example',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      ),
  })

  const result = await createAuthHttpClient(apiClient).getSession()

  assert.equal(result.user.email, 'user@example.com')
  assert.equal(result.user.id, 'kc-user-1')
})

test('auth client works with a client created by createApiClient', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response(
        JSON.stringify({
          user: {
            id: 'kc-user-2',
            email: 'another@example.com',
            displayName: 'Another User',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      ),
  })

  const result = await createAuthHttpClient(apiClient).getSession()

  assert.equal(result.user.email, 'another@example.com')
})

test('auth client prefers backend error payload when the request fails', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response(
        JSON.stringify({
          errorCode: 'UNAUTHORIZED',
          message: 'Session is missing or expired.',
          statusCode: 401,
        }),
        {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }
      ),
  })

  await assert.rejects(
    () => createAuthHttpClient(apiClient).getSession(),
    (error: unknown) => {
      assert.ok(error instanceof ApiClientError)
      assert.equal(error.message, 'Session is missing or expired.')
      assert.equal(error.errorCode, 'UNAUTHORIZED')
      assert.equal(error.statusCode, 401)
      return true
    }
  )
})

test('auth client returns the login URL payload', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response(
        JSON.stringify({
          url: 'https://keycloak.example.com/realms/meta/protocol/openid-connect/auth',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      ),
  })

  const result = await createAuthHttpClient(apiClient).getLoginUrl()

  assert.equal(
    result.url,
    'https://keycloak.example.com/realms/meta/protocol/openid-connect/auth'
  )
})

test('auth client returns the logout response payload', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response(
        JSON.stringify({
          success: true,
          message: 'Logout completed.',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      ),
  })

  const result = await createAuthHttpClient(apiClient).logout()

  assert.equal(result.success, true)
  assert.equal(result.message, 'Logout completed.')
})

test('auth client returns the refreshed auth session payload', async () => {
  const apiClient = createApiClient({
    baseUrl: 'http://localhost:3000',
    fetch: async () =>
      new Response(
        JSON.stringify({
          user: {
            id: 'kc-user-4',
            email: 'refresh@example.com',
            displayName: 'Refresh User',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      ),
  })

  const result = await createAuthHttpClient(apiClient).refresh()

  assert.equal(result.user.id, 'kc-user-4')
  assert.equal(result.user.email, 'refresh@example.com')
})
