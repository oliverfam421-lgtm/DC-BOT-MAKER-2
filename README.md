# Rose Bot Maker

A small **Render-ready** web app for updating a Discord bot's application name and description. It does **not** store bot tokens and it does not create Discord applications; it updates the application associated with the token you provide.

## Deploy to Render

1. Push this repository to GitHub.
2. Sign in to [Render](https://render.com).
3. Click **New** → **Blueprint**.
4. Connect your GitHub account and select `oliverfam421-lgtm/DC-BOT-MAKER-2`.
5. Render will read `render.yaml` and create the `rose-bot-maker` web service.
6. Choose the free plan if prompted, then click **Apply**.
7. Wait for the deployment to finish.
8. Open the URL shown for the service, such as `https://rose-bot-maker.onrender.com`.
9. Enter your Discord bot token, bot name, and description, then click **Save bot details**.

Render automatically provides the `PORT` environment variable. No environment variables are required.

### Manual Render setup

If you do not want to use the Blueprint file, create a **Web Service** from the repository with:

- **Runtime:** Node
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Plan:** Free or another plan of your choice

## Security

Use the HTTPS Render URL, never paste a token into an issue or chat, and rotate the token in the Discord Developer Portal if you think it was exposed. Requests are rate-limited and tokens are not written to disk or logs.

Rose Bot Maker only changes the name and description of an existing Discord application. It does not create Discord applications, add commands, or make the bot respond to messages.
