## How to build SDE static backend
Create a `.sde` Folder in the root directory of this repo.
Copy all JSONL Files in this directory.

Adjust ./prisma/seed/importSdeFiles.ts accordingly.

Run:
`npx tsx --env-file .env .\prisma\seed\index.ts`