const fetch = require('node-fetch')

/**
 * Minimal OpenAI-compatible chat client using fetch
 * Requires process.env.OPENAI_API_KEY and optional process.env.OPENAI_BASE_URL
 */
class LlmClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY
    this.baseUrl = (options.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '')
    this.model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }
  }

  async chat(messages, opts = {}) {
    const url = `${this.baseUrl}/v1/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: opts.model || this.model,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.max_tokens ?? 4000
      })
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`LLM API error ${res.status}: ${text}`)
    }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    return content
  }
}

module.exports = LlmClient


