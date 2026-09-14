import test from 'node:test'
import assert from 'node:assert/strict'
import { app } from './server.js'

const startTestServer = async () => {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  return { server, baseUrl: `http://127.0.0.1:${port}` }
}

test('question creation requires admin verification', async () => {
  const { server, baseUrl } = await startTestServer()

  try {
    const blocked = await fetch(`${baseUrl}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Test question prompt',
        options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
        correct: 'Alpha',
      }),
    })

    assert.equal(blocked.status, 401)

    const allowed = await fetch(`${baseUrl}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Code': 'Demo@7078',
      },
      body: JSON.stringify({
        prompt: 'Admin success question',
        options: ['One', 'Two', 'Three', 'Four'],
        correct: 'One',
      }),
    })

    assert.equal(allowed.status, 200)
    const payload = await allowed.json()
    assert.equal(payload.ok, true)
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }
})

test('admin reset restores the default questions', async () => {
  const { server, baseUrl } = await startTestServer()

  try {
    const reset = await fetch(`${baseUrl}/api/questions/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Code': 'Demo@7078',
      },
    })

    assert.equal(reset.status, 200)
    const payload = await reset.json()
    assert.equal(payload.ok, true)
    assert.equal(Array.isArray(payload.questions), true)
    assert.ok(payload.questions.length > 0)
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }
})
