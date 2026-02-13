// Simple node js express server
const express = require("express");
const app = express();
const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");

const port = 3000;
// wildcard route to catch all requests and log the host and body

const ORIGINAL_HOST = "https://api.dev.jajav2.jaja.co.uk"; // This should be set by a profile.

const useProxy = (req, res) => {
  return createProxyMiddleware({
    target: ORIGINAL_HOST,
    changeOrigin: true,
    secure: true,
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader("x-bypass-proxyman", "true");
      fixRequestBody(proxyReq, req);
    },
  })(req, res);
};

const mapPathToBlock = (path: string) => {
    // Get list of blocks from db 
    // Check if path matches any block 
    // If it does We will write a function to return block response template
    // If not, use Proxy
};

app.get("*", (req, res) => {
  const host = req.headers.host;
  console.log(`Received POST request for host: ${host}`);
  console.log("Request body:", req.body);
  console.log("Request headers:", req.headers);

  useProxy(req, res);
});

app.post("*", (req, res) => {
  const host = req.headers.host;
  console.log(`Received POST request for host: ${host}`);
  console.log("Request body:", req.body);
  console.log("Request headers:", req.headers);

  useProxy(req, res);
});

app.put("*", (req, res) => {
    const host = req.headers.host;
    console.log(`Received POST request for host: ${host}`);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
  
    useProxy(req, res);
  });

  app.patch("*", (req, res) => {
    const host = req.headers.host;
    console.log(`Received POST request for host: ${host}`);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
  
    useProxy(req, res);
  });

  app.delete("*", (req, res) => {
    const host = req.headers.host;
    console.log(`Received POST request for host: ${host}`);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
  
    useProxy(req, res);
  });

  app.options("*", (req, res) => {
    const host = req.headers.host;
    console.log(`Received POST request for host: ${host}`);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
  
    useProxy(req, res);
  });
// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
