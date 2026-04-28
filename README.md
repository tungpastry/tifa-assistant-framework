<div align="center">
  <img src="public/logo.png" alt="TradeVibe Logo" width="200"/>
</div>

# TradeVibe

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)

TradeVibe is a daily "vibe" dashboard and interactive AI assistant for traders. It generates a daily trader mood, motivational quote, voice clip, and curated music playlist bundle to help traders maintain focus and a positive mindset.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Prerequisites
- Node.js >= 18.18.0
- Python >= 3.10
- [Ollama](https://ollama.ai/) installed locally with models (e.g., `qwen2.5`, `gemma2`)
- [Piper TTS](https://github.com/rhasspy/piper) installed locally
- API Keys for YouTube Data API and Spotify API

## Installation

1. **Clone the repository:**
   ```bash
   git clone git@github.com:tungpastry/tradevibe-org.git
   cd tradevibe-org
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in the required values (Ollama URLs, YouTube/Spotify API keys, Piper binary path).

3. **Install dependencies:**
   ```bash
   npm ci
   ```

## Usage

**Development Mode:**
```bash
npm run dev
```
This will initialize the `runtime/` directory and start the Next.js development server at `http://localhost:3100`.

**Production Build:**
```bash
npm run build
npm run start
```

### Testing
You can run a quick set of API smoke tests to verify your local endpoints are responding correctly to validation checks.
```bash
npm run smoke:api
```

## Documentation
For detailed technical documentation, please refer to the `docs/` directory:
- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Deployment](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

## Roadmap
- [x] Decouple Python pipeline and Next.js frontend
- [x] Integrate real-time chat with local LLMs (Tifa)
- [ ] Add user authentication and personalized history
- [ ] Expand music providers (Apple Music)

## Contributing
Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

## License
This project is licensed under the [MIT License](LICENSE).

## Contact
Created by [tungpastry](mailto:bakerthanhtung@gmail.com).
