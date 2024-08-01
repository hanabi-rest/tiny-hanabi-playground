import { html } from 'hono/html'
import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://unpkg.com/htmx.org@1.9.3"></script>
        <script src="https://unpkg.com/hyperscript.org@0.9.9"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <title>tiny hanabi playground</title>
      </head>
      <body>
        <div class="p-4">
          <h1 class="text-4xl font-bold mb-4">Deploy Cloudflare Workers simple demo</h1>
          ${children}
        </div>
      </body>
    </html>
  `
})

export const DeployCode = () => (
  <form hx-post="/deploy-cloudflare" hx-target="#deploy" hx-swap="beforebegin" _="on htmx:afterRequest reset() me" class="mb-4">
  <div class="mb-2">
    <div class="mb-2">
      <label for="accountId">Account ID</label>
      <input name="accountId" type="text" class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5" id="accountId" />
    </div>
    <div class="mb-2">
      <label for="name">Name</label>
      <input name="name" type="text" class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5" id="name" />
    </div>
    <div class="mb-2">
      <label for="token">Token</label>
      <input name="token" type="text" class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5" id="token" />
    </div>
    <div class="mb-2">
      <label for="sql">SQL</label>
      <input name="sql" type="text" class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5" id="sql" />
    </div>
    <div class="mb-2">
      <label for="code">JavaScript</label>
        <textarea 
          name="JavaScript" 
          className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 w-full h-64" 
          id="code" 
        />
    </div>
  </div>
    <button class="text-white bg-blue-700 hover:bg-blue-800 rounded-lg px-5 py-2 text-center" type="submit">
      Deploy
    </button>
  </form>
)