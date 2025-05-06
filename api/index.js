import app from "../src/app.js"

export default (req, res) => {
  // This is necessary for Vercel serverless functions
  // It forwards the request to our Express app
  app(req, res)
}
