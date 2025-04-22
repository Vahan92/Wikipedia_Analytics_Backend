# Backend Architecture Overview
## MVC Structure
I organize code into Models, Views, and Controllers:

Models handle data structures
Controllers orchestrate request logic
Service layer manages external API calls

This clear separation simplifies unit testing and future feature expansion.

## Service Layer
All third-party API interactions live in src/services/:

Wikipedia pageviews
AWS S3 uploads
Analytics metrics (Plausible/Matomo)

I use the AWS SDK v3's modular client (@aws-sdk/client-s3) to reduce bundle size and improve tree-shaking.
## Caching Strategy
I cache Wikipedia API responses in-memory using Node-Cache with a 2-hour TTL to avoid redundant calls and respect rate limits. This lightweight key-value cache improves performance and simplifies invalidation.
## Cron Job & Archiving
A daily cron job (node-cron) runs a scheduled task to:

Fetch the past 30 days of pageview data
Upload JSON archives to S3 under a archives/YYYY-MM-DD.json key format

This logic lives in a separate job file and logs all operations for auditability.
## AWS S3 Integration

I configure S3Client with region and credentials from environment variables.
Archives are uploaded using PutObjectCommand.
A consistent key prefix (archives/) is used to structure data by date.

## Configuration & Environment

In development, I use dotenv to load variables from .env.
In production (e.g. Render.com), I use Render's environment UI.

### Best practices:

Do not commit .env
Prefix client-exposed vars with VITE_
Mark secrets as "Secret" in Render

## Error Handling & Logging

Express's middleware pattern handles sync and async errors (next(err))
All errors return standardized JSON responses
Logging is managed via Winston or Pino for structured logs (timestamp, level, message, context)

## Deployment

Deployed as a Web Service on Render.com
Start command: npm start
Express binds to process.env.PORT (injected by Render)
Zero-downtime deploys via Git push
CORS origins are loaded from ALLOWED_ORIGINS

## Security Considerations

No hard-coded secrets: all tokens/keys are injected via environment variables
CORS: only allow known origins
HTTPS: Render provides free TLS
