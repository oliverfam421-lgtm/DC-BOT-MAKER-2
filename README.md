# Rose Bot Maker

A small Railway-ready web app for updating a Discord bot's application name and description. It does **not** store bot tokens and it does not create Discord applications; it updates the application associated with the token you provide.

## Deploy to Railway

1. Push this repository to Railway or create a new Railway project from GitHub.
2. Railway detects `package.json` and runs `npm start` automatically.
3. Generate a public domain from the service's **Networking** settings.
4. Open the domain, enter a bot token, name, and description, then submit.

No environment variables are required. Railway supplies `PORT` automatically.

## Security

Use HTTPS (the Railway-generated domain is HTTPS), never paste a token into an issue or chat, and rotate the token in the Discord Developer Portal if you think it was exposed. Requests are rate-limited and tokens are not written to disk or logs.
