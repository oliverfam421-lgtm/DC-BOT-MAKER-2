# Rose Bot Maker

Describe commands in plain English in one box, and Rose Bot Maker registers them as real Discord slash commands.

Example:

```text
Make a ping command that replies Pong.
Make a hello command that says Hello and welcomes the user.
Make a rules command that replies Be respectful and follow the server rules.
```

This creates `/ping`, `/hello`, and `/rules`. Each command is registered with Discord and replies with the response extracted from its description.

This version uses a safe built-in parser rather than an AI service. Supported wording includes `make`, `create`, or `add`, followed by a command name and `command that replies/says ...`. One command should be placed on each line. Complex actions such as music, moderation, databases, or external APIs require additional custom code.

## Render deployment

1. In Render, choose **New → Blueprint** and select this repository.
2. Render reads `render.yaml`, installs dependencies, and runs `npm start`.
3. Open the generated HTTPS URL.
4. Enter the token, bot name, and plain-English command descriptions.
5. Click **Start bot and create commands**.
6. Click **Invite bot to your server** and authorize the bot.

The token is held in memory only and is never written to a file or printed in logs. A restart requires submitting the form again. Never share a bot token; reset it in the Discord Developer Portal if exposed.
