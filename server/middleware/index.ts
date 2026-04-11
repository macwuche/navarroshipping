import { Request, Response, NextFunction } from "express"

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ message: "Not authenticated" })
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any
  if (req.isAuthenticated() && user?.role === "admin") {
    return next()
  }
  res.status(403).json({ message: "Access denied" })
}
