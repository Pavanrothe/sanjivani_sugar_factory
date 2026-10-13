import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import { Pool } from "pg";
import * as z from "zod/v4";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

interface Farmer {
  id: number;
  name: string;
  village: string;
  sugarcane_tons: number;
  amount_paid: number;
  payment_pending: number;
}

const app = express();
const db = new Pool();
const port = Number(process.env.PORT ?? 3000);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const adminUsername = process.env.ADMIN_USERNAME?.trim();
const adminPassword = process.env.ADMIN_PASSWORD?.trim();
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const sessions = new Map<string, { username: string; expiresAt: number }>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

if (!adminUsername || !adminPassword) {
  throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file before starting the app.");
}

app.use(express.json({ limit: "16kb" }));

function secureCookieOptions(maxAge: number) {
  return [
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

function credentialsMatch(candidate: string, expected: string): boolean {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

function getSessionId(request: express.Request): string | undefined {
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("sanjivani_session="));
  return cookie?.slice("sanjivani_session=".length);
}

app.get("/api/session", (request, response) => {
  const sessionId = getSessionId(request);
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    response.json({ authenticated: false });
    return;
  }
  response.json({ authenticated: true, username: session.username });
});

const loginSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
});

app.post("/api/login", (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Enter your admin username and password." });
    return;
  }

  const now = Date.now();
  const clientKey = request.ip ?? "unknown";
  const attempts = loginAttempts.get(clientKey);
  if (attempts && attempts.resetAt > now && attempts.count >= 10) {
    response.status(429).json({ error: "Too many sign-in attempts. Wait 15 minutes and try again." });
    return;
  }

  const usernameMatches = credentialsMatch(parsed.data.username, adminUsername);
  const passwordMatches = credentialsMatch(parsed.data.password, adminPassword);
  if (!usernameMatches || !passwordMatches) {
    const current = attempts && attempts.resetAt > now
      ? attempts
      : { count: 0, resetAt: now + 15 * 60 * 1000 };
    current.count += 1;
    loginAttempts.set(clientKey, current);
    response.status(401).json({ error: "Invalid username or password." });
    return;
  }

  loginAttempts.delete(clientKey);
  const sessionId = randomBytes(32).toString("base64url");
  sessions.set(sessionId, { username: adminUsername, expiresAt: now + sessionLifetimeMs });
  response.setHeader("Set-Cookie", `sanjivani_session=${sessionId}; ${secureCookieOptions(sessionLifetimeMs)}`);
  response.json({ username: adminUsername });
});

app.post("/api/logout", (request, response) => {
  const sessionId = getSessionId(request);
  if (sessionId) sessions.delete(sessionId);
  response.setHeader("Set-Cookie", `sanjivani_session=; ${secureCookieOptions(0)}`);
  response.status(204).end();
});

function requireAdmin(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
) {
  const sessionId = getSessionId(request);
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}

function normalizeFarmer(row: {
  id: number | string;
  name: string;
  village: string;
  sugarcane_tons: number | string;
  amount_paid: number | string;
  payment_pending: number | string;
}): Farmer {
  return {
    id: Number(row.id),
    name: row.name,
    village: row.village,
    sugarcane_tons: Number(row.sugarcane_tons),
    amount_paid: Number(row.amount_paid),
    payment_pending: Number(row.payment_pending),
  };
}

async function getFarmers(): Promise<Farmer[]> {
  const result = await db.query<{
    id: number | string;
    name: string;
    village: string;
    sugarcane_tons: number | string;
    amount_paid: number | string;
    payment_pending: number | string;
  }>(`
    SELECT id, name, village, sugarcane_tons, amount_paid, payment_pending
    FROM farmers
    ORDER BY sugarcane_tons DESC
  `);

  return result.rows.map((row) => normalizeFarmer(row));
}

const farmerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  village: z.string().trim().min(1).max(100),
  sugarcane_tons: z.coerce.number().min(0).max(1000000),
  amount_paid: z.coerce.number().min(0).max(100000000),
  payment_pending: z.coerce.number().min(0).max(100000000),
});

app.post("/api/farmers", requireAdmin, async (request, response, next) => {
  try {
    const parsed = farmerSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Provide valid farmer details: name, village, sugarcane tons, paid amount, and pending payment." });
      return;
    }

    const { name, village, sugarcane_tons, amount_paid, payment_pending } = parsed.data;
    const result = await db.query<{
      id: number;
      name: string;
      village: string;
      sugarcane_tons: number;
      amount_paid: number;
      payment_pending: number;
    }>(`
      INSERT INTO farmers (name, village, sugarcane_tons, amount_paid, payment_pending)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, village, sugarcane_tons, amount_paid, payment_pending
    `, [name, village, sugarcane_tons, amount_paid, payment_pending]);

    response.status(201).json({ farmer: normalizeFarmer(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/farmers/:id", requireAdmin, async (request, response, next) => {
  try {
    const farmerId = Number(request.params.id);
    if (!Number.isInteger(farmerId) || farmerId <= 0) {
      response.status(400).json({ error: "Invalid farmer id." });
      return;
    }

    const parsed = farmerSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Provide valid farmer updates." });
      return;
    }

    const updates = Object.entries(parsed.data);
    if (updates.length === 0) {
      response.status(400).json({ error: "No farmer updates were provided." });
      return;
    }

    const setClauses = updates.map(([key], index) => `${key} = $${index + 2}`).join(", ");
    const values = [farmerId, ...updates.map(([, value]) => value)];

    const result = await db.query<{
      id: number;
      name: string;
      village: string;
      sugarcane_tons: number;
      amount_paid: number;
      payment_pending: number;
    }>(`
      UPDATE farmers
      SET ${setClauses}
      WHERE id = $1
      RETURNING id, name, village, sugarcane_tons, amount_paid, payment_pending
    `, values);

    if (result.rowCount === 0) {
      response.status(404).json({ error: "Farmer not found." });
      return;
    }

    response.json({ farmer: normalizeFarmer(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard", requireAdmin, async (_request, response, next) => {
  try {
    const farmers = await getFarmers();
    response.json({
      farmers,
      summary: {
        farmerCount: farmers.length,
        totalTons: farmers.reduce((total, farmer) => total + farmer.sugarcane_tons, 0),
        totalPaid: farmers.reduce((total, farmer) => total + farmer.amount_paid, 0),
        totalPending: farmers.reduce((total, farmer) => total + farmer.payment_pending, 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

const questionSchema = z.object({
  question: z.string().trim().min(1).max(1000),
});

app.post("/api/ask", requireAdmin, async (request, response, next) => {
  try {
    const parsed = questionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Enter a question of up to 1,000 characters." });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      response.status(503).json({ error: "OPENAI_API_KEY is not configured on the server." });
      return;
    }

    const farmers = await getFarmers();
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const answer = await openai.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.5",
      instructions:
        "Answer the user's question using only the supplied farmer records. " +
        "Do not invent facts; say when the records do not contain the answer. " +
        "Use clear, concise language and format currency amounts as provided by the data.",
      input: `Question: ${parsed.data.question}\n\nFarmer records:\n${JSON.stringify(farmers)}`,
    });

    response.json({ answer: answer.output_text });
  } catch (error) {
    next(error);
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(currentDirectory, "dist")));
  app.get("/{*path}", (_request, response) => {
    response.sendFile(path.join(currentDirectory, "dist", "index.html"));
  });
}

app.use(
  (error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error("API request failed:", error);
    response.status(500).json({ error: "The request could not be completed. Check the server logs." });
  },
);

const server = app.listen(port, () => {
  console.log(`Sanjivani dashboard API listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      void db.end().finally(() => process.exit(0));
    });
  });
}
