import express, { Express, Request, Response, NextFunction } from "express"
import session from "express-session"
import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import pg from "pg"
import connectPgSimple from "connect-pg-simple"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./db/schema"
import { users } from "./db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { WebSocketServer } from "ws"
import http from "http"
import path from "path"
import * as dotenv from "dotenv"
import { createRouter } from "./routes"

dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 5000

// Trust Replit's (and any) reverse proxy so req.secure is correct
// and express-session sets Secure cookies properly over HTTPS
app.set("trust proxy", 1)

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const db = drizzle(pool, { schema })

// Session store
const PgSession = connectPgSimple(session)
const sessionStore = new PgSession({
  pool,
  createTableIfMissing: true,
})

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session configuration
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
)

// Passport configuration
app.use(passport.initialize())
app.use(passport.session())

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        })

        if (!user) {
          return done(null, false, { message: "Invalid email or password" })
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" })
        }

        return done(null, { id: user.id, email: user.email, name: user.name, role: user.role })
      } catch (error) {
        return done(error)
      }
    }
  )
)

passport.serializeUser((user: any, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    })
    if (!user) {
      return done(null, false)
    }
    done(null, { id: user.id, email: user.email, name: user.name, role: user.role })
  } catch (error) {
    done(error)
  }
})

// Create default admin user if not exists
async function createDefaultAdmin() {
  const adminExists = await db.query.users.findFirst({
    where: eq(users.email, "admin@navarroshipping.com"),
  })

  if (!adminExists) {
    const passwordHash = await bcrypt.hash("admin123", 10)
    await db.insert(users).values({
      email: "admin@navarroshipping.com",
      passwordHash,
      name: "Admin User",
      role: "admin",
    })
    console.log("✓ Default admin user created: admin@navarroshipping.com / admin123")
  }
}

// Create HTTP + WebSocket server early so broadcast is available to routes
const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: "/ws" })

wss.on("connection", () => {
  // clients connect/disconnect silently
})

function broadcast(data: object) {
  const msg = JSON.stringify(data)
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* OPEN */) client.send(msg)
  })
}

// Mount all routes
app.use("/api", createRouter(db, broadcast))

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const [newUser] = await db.insert(users).values({ name, email, passwordHash, role: "customer" }).returning()
    const sessionUser = { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }
    req.logIn(sessionUser, (err) => {
      if (err) return next(err)
      broadcast({ type: "user:new", user: { ...sessionUser, createdAt: newUser.createdAt } })
      res.status(201).json({ user: sessionUser, message: "Account created successfully" })
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Registration failed" })
  }
})

app.post("/api/auth/login", (req, res, next) => {
  passport.authenticate("local", (err: Error | null, user: any, info: { message: string } | undefined) => {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || "Authentication failed" })
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err)
      }
      res.json({ user, message: "Login successful" })
    })
  })(req, res, next)
})

app.post("/api/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err)
    }
    res.json({ message: "Logout successful" })
  })
})

app.get("/api/auth/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user })
  } else {
    res.status(401).json({ message: "Not authenticated" })
  }
})

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../client/dist")))
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../client/dist/index.html"))
  })
}

// Handle port conflicts
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Exiting...`)
    process.exit(1)
  }
  console.error("Server error:", error)
  process.exit(1)
})

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`)

  // Try to create default admin (will fail if DB not available)
  try {
    await createDefaultAdmin()
  } catch (error) {
    console.log("⚠️  Database not available - admin user not created")
    console.log("   Connect to PostgreSQL to enable authentication")
  }
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...")
  server.close(() => {
    pool.end()
    process.exit(0)
  })
})
