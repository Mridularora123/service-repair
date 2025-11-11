
# Service Repair - Shopify Private App (minimal)

This repository contains a minimal Node/Express app that provides:
- MongoDB models for categories, series, models, injury types, prices, and submissions
- Public API endpoints for the embeddable widget
- Simple admin endpoints protected by ADMIN_PASSWORD (header)
- An embeddable widget (public/widget.js) and a Liquid snippet for theme inclusion

IMPORTANT: This is a starter app for private/custom Shopify installs. You must set environment variables and deploy to a host with MongoDB.

Required environment variables:
- MONGODB_URI
- ADMIN_PASSWORD

To run locally:
1. Install dependencies: npm install
2. Start MongoDB locally or use Atlas and set MONGODB_URI
3. Run: npm run dev

The public widget is available at /public/widget.js
The admin UI (simple) is at /admin (prompt asks for password)
