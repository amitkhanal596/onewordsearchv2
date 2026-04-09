# One Word Search - Unlimited

An unlimited version of the word search puzzle game, inspired by [onewordsearch.com](https://onewordsearch.com). I loved playing the original game but wanted to enjoy unlimited puzzles without restrictions, so I built my own version!

## Features

- **Unlimited Puzzles**: Play as many word search puzzles as you want
- **Daily Challenges**: New curated puzzles available daily
- **Random Puzzles**: Generate random puzzles on demand
- **Progress Tracking**: Save your game completion history
- **Leaderboard**: Compete with other players based on completion time and stars earned
- **User Authentication**: Secure sign-up and login with email/password

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Caching**: Redis
- **Authentication**: Supabase Auth
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- Redis server (for leaderboard worker)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd onewordsearchv2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials from your [Supabase dashboard](https://supabase.com/dashboard)

```bash
cp .env.example .env.local
```

4. Run database migrations:
```bash
npm run migrate:apply
```

5. Start the development server:
```bash
npm run dev
```

6. (Optional) Start the leaderboard worker for real-time rankings:
```bash
npm run worker:start
```

Visit [http://localhost:3000](http://localhost:3000) to start playing!

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (puzzle, progress, leaderboard)
│   ├── auth/          # Authentication pages
│   ├── puzzle/        # Puzzle game page
│   ├── leaderboard/   # Leaderboard page
│   └── page.tsx       # Home page
├── components/        # React components
├── hooks/            # Custom React hooks
├── services/         # Backend services (Redis, auth verification)
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## API Endpoints

- `GET /api/puzzle/random` - Get a random puzzle
- `GET /api/puzzle/daily` - Get today's daily puzzle
- `GET /api/puzzle/[id]` - Get a specific puzzle by ID
- `POST /api/progress/complete` - Record puzzle completion
- `GET /api/progress/history` - Get user's completion history
- `GET /api/leaderboard` - Get top players

## Database Schema

The app uses four main tables:
- **puzzles**: Stores puzzle data (grid, words, metadata)
- **game_results**: Records user puzzle completions with timestamps and stars
- **user_stats**: Aggregates user statistics for leaderboard rankings
- **profiles**: Extended user profile information

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Contributing

This is a personal project, but feel free to fork it and make it your own!

## License

MIT

## Acknowledgments

Inspired by [onewordsearch.com](https://onewordsearch.com) - thanks for creating such an enjoyable puzzle game!
