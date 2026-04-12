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

## Documentation

See `.github/` folder for all project docs:

- **[.github/INDEX.md](./.github/INDEX.md)** — Documentation navigation
- **[.github/IMPLEMENTATION_PLAN.md](./.github/IMPLEMENTATION_PLAN.md)** — Architecture & design
- **[.github/TASK_LIST.md](./.github/TASK_LIST.md)** — Implementation tasks
- **[.github/UX_FLOW_DECISION.md](./.github/UX_FLOW_DECISION.md)** — UX specification (locked)
- **[.github/SUMMARY.md](./.github/SUMMARY.md)** — Quick reference

## Development Timeline

This project was developed incrementally over 5 days:

| Phase | Date | Focus | Details |
|-------|------|-------|---------|
| Initial Setup | Apr 7 | Full project upload | All code, config, docs |
| Security Review | Apr 8 | Post-launch audit | Comprehensive security assessment |
| Code Quality | Apr 9 | Bug fixes & cleanup | Remove unused try/catch wrapper |
| Hardening | Apr 10 | Security fixes | Tighten manifest permissions |
| Legal Prep | Apr 11 | License & attribution | Add MIT License |
| Final Docs | Apr 12 | Developer guides | Copilot instructions, timeline |

See [commit history](https://github.com/muhammadtalhaishtiaq/quip/commits/main) for step-by-step development.

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

- Memory overhead: **<20MB** (vs CommentRocket: ~200MB)
- Scroll FPS: **55-60fps maintained** (vs CommentRocket: visible jank)
- Content script bundle: **<12KB**
- Panel load time: **<500ms**

## Privacy & Security

- ✅ **No data collection**: Zero telemetry, analytics, or tracking
- ✅ **No backend**: All processing in your browser
- ✅ **API key is local**: Stored in chrome.storage.local, never transmitted except to OpenAI
- ✅ **Post content**: Sent to OpenAI only for comment generation
- ✅ **Open source**: Audit the code on GitHub

## Timeline

**10 working days to MVP on Chrome Web Store**

| Phase | Days | Focus |
|-------|------|-------|
| Foundation | 1-3 | Vite setup, popup UI, service worker |
| LinkedIn Panel | 4-6 | Panel UI, generation, text insertion |
| Polish | 7-8 | Error handling, performance, accessibility |
| Release | 9-10 | Chrome Web Store submission, launch |

## Tasks

See [.github/TASK_LIST.md](./.github/TASK_LIST.md) for complete task breakdown by day and phase.

**Start here**: [.github/TASK_LIST.md — Phase 1, Day 1, Task 1.1](./.github/TASK_LIST.md#day-1-project-setup--types)

## License

MIT License — See LICENSE file

## Support

- Report bugs: [GitHub Issues](https://github.com/[username]/quip/issues)
- Suggest features: [GitHub Discussions](https://github.com/[username]/quip/discussions)
"# quip" 
