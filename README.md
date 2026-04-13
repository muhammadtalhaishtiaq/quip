# Quip — AI Comment Generator for LinkedIn

Generate context-aware AI-powered comments for LinkedIn posts using your own OpenAI API key.

## Features

- ✨ **AI-Powered**: Uses GPT-4o mini for smart, contextual comments
- 🔒 **Private**: 100% local processing, no backend servers
- ⚡ **Lightweight**: <20MB memory overhead, no scroll jank
- 🎨 **Beautiful UI**: Premium Tailwind CSS design
- 🎯 **Multi-Select**: Blend tones (Professional + Friendly) and intents
- 📋 **Manual Control**: You control every step, no auto-posting
- 🆓 **Free**: Bring your own OpenAI API key

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server (watch mode)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Click the Quip icon in your toolbar to configure

## Usage

1. **Setup** (one-time)
   - Click Quip icon
   - Enter your OpenAI API key
   - Configure default tone, length, intent
   - Click "Test Connection" to verify

2. **Generate Comments**
   - Navigate to LinkedIn feed
   - Click the **✨ Generate** button on any post (new button added to post action bar)
   - Quip panel appears
   - Click **[Generate Comment]** in the panel
   - Choose from 2 AI suggestions
   - Click **[Select & Insert]** or **[Copy]**
   - Review and click LinkedIn's **[Post]** button

3. **Quick Overrides** (per-post)
   - Use chips like [Shorter], [Funnier], [More Casual] to tweak tone
   - Changes apply only to current post

## Development Timeline

Built incrementally over 5 days (Apr 8-12):

| Date | Focus | What Was Added |
|------|-------|-----------------|
| Apr 8 | Configuration & Setup | Build tooling, manifest, icons |
| Apr 9 | Core Architecture | Type system, storage layer, docs |
| Apr 10 | Backend Services | Service worker, OpenAI API integration |
| Apr 11 | UI & Settings | Popup UI, settings page, MIT license |
| Apr 12 | Content Integration | LinkedIn detection, panel component, final docs |

See [commit history](https://github.com/muhammadtalhaishtiaq/quip/commits/main) for details.

## Tech Stack

- **TypeScript** — Type-safe development
- **Vite** — Fast build tool
- **Tailwind CSS** — Beautiful UI
- **@crxjs/vite-plugin** — Chrome extension bundling
- **Vanilla DOM** — No React/Vue (keeps bundle small)

## Architecture

```
Popup (Settings)
    ↓
    └─→ chrome.storage.local ←←← Content Script (LinkedIn)
                                  ↓
                            Service Worker ←→ OpenAI API
```

- **Popup**: Configure API key, tone preferences
- **Content Script**: Detect LinkedIn posts, inject panel, handle insertion
- **Service Worker**: Call OpenAI API, manage authorization
- **Shadow DOM Panel**: Isolated UI on LinkedIn page

## Performance

- Lightweight: No framework overhead, vanilla DOM only
- Content script bundle: Minimal <15KB
- Chrome storage used for persistence (no external databases)

## Privacy & Security

- ✅ **No data collection**: Zero telemetry, analytics, or tracking
- ✅ **No backend**: All processing in your browser
- ✅ **API key is local**: Stored in chrome.storage.local, never transmitted except to OpenAI
- ✅ **Post content**: Sent to OpenAI only for comment generation
- ✅ **Open source**: Audit the code on GitHub

## Timeline

## License

MIT License — See LICENSE file

## Support

- Report bugs: [GitHub Issues](https://github.com/[username]/quip/issues)
- Suggest features: [GitHub Discussions](https://github.com/[username]/quip/discussions)
"# quip" 
[LICENSE](./LICENSE) file for details.

## Contributing

This is an open-source project. Feel free to fork, modify, and submit pull requests!