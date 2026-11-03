import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

try {
  await connectDatabase(env.mongoUri);
  app.listen(env.port, () => {
    console.log(`CivicConnect API listening on http://localhost:${env.port}`);
  });
} catch (error) {
  console.error(`Unable to start CivicConnect API: ${error.message}`);
  process.exitCode = 1;
}
