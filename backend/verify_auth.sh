#!/bin/bash

# 1. Signup
echo "--- Signup ---"
curl -s -X POST "http://localhost:8000/api/auth/signup" \
     -H "Content-Type: application/json" \
     -d '{"email": "user1@example.com", "password": "password123"}' | jq
echo ""

# 2. Login
echo "--- Login ---"
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/auth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=user1@example.com&password=password123")
echo $TOKEN_RESPONSE | jq
TOKEN=$(echo $TOKEN_RESPONSE | jq -r .access_token)
echo ""

# 3. Add Key (Protected)
echo "--- Add Key ---"
curl -s -X POST "http://localhost:8000/api/keys" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "test_key", "access_key": "acc1", "secret_key": "sec1", "exchange": "bithumb"}' | jq
echo ""

# 4. List Keys (Protected)
echo "--- List Keys ---"
curl -s -X GET "http://localhost:8000/api/keys" \
     -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 5. Signup User 2
echo "--- Signup User 2 ---"
curl -s -X POST "http://localhost:8000/api/auth/signup" \
     -H "Content-Type: application/json" \
     -d '{"email": "user2@example.com", "password": "password456"}' | jq
echo ""

# 6. Login User 2
echo "--- Login User 2 ---"
TOKEN_RESPONSE_2=$(curl -s -X POST "http://localhost:8000/api/auth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=user2@example.com&password=password456")
TOKEN_2=$(echo $TOKEN_RESPONSE_2 | jq -r .access_token)
echo ""

# 7. List Keys User 2 (Should be empty)
echo "--- List Keys User 2 (Should be empty) ---"
curl -s -X GET "http://localhost:8000/api/keys" \
     -H "Authorization: Bearer $TOKEN_2" | jq
echo ""
