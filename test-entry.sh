#!/bin/bash

echo "Testing entry creation with HuggingFace embeddings..."
echo "This may take 20-30 seconds for first request..."

curl -X POST http://localhost:3000/api/entries/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyY2MyNGI5YS1kNDY4LTRhZGYtOWU2NC0zNjU5ZDhjNTY5NTciLCJlbWFpbCI6ImthcnRpa0B0ZXN0LmNvbSIsImlhdCI6MTc3MDEzMDMzNSwiZXhwIjoxNzcyNzIyMzM1fQ.uAP9kqOgfDOf-uJkVl1iYyxE7ZqSXrym8I0WrH2HgXg" \
  -d '{"text":"Testing HuggingFace embeddings with real API","life_aspect":"work"}'

echo ""
echo "Done!"
