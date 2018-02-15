############################################
# Endpoint: check_username
# Action: Send unique username and email
# Expected Response: 200
############################################
code=$(curl -XGET localhost:3002/api/check_username -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde12345","email":"abcde12345@gmail.com"}}' | jq '.code')
if [[ ! $code -eq 200 ]]; then
    echo "- Test check username with non-existing user failed. Expected server code 200, got ${code}"
else
    echo "+ Test check username with non-existing user passed"
fi

############################################
# Endpoint: signup
# Action: Send valid unique username and email
# Expected Response: 201
############################################
code=$(curl -XPOST localhost:3002/api/signup -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde12345","email":"abcde12345@gmail.com","password":"defaultpass"}}' | jq '.code')
if [[ ! $code -eq 201 ]]; then
    echo "- Test sign up request with non-existing user failed. Expected server code 201, got ${code}"
else
    echo "+ Test sign up request with non-existing user passed"
fi

############################################
# Endpoint: check_username
# Action: Send existing username and email
# Expected Response: 100
############################################
code=$(curl -XGET localhost:3002/api/check_username -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde12345","email":"abcde12345@gmail.com"}}' | jq '.code')
if [[ ! $code -eq 100 ]]; then
    echo "- Test check username with existing user failed. Expected server code 100, got ${code}"
else
    echo "+ Test check username with existing user passed"
fi

############################################
# Endpoint: signup
# Action: Send existing username and email
# Expected Response: 100
############################################
code=$(curl -XPOST localhost:3002/api/signup -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde12345","email":"abcde12345@gmail.com","password":"defaultpass"}}' | jq '.code')
if [[ ! $code -eq 100 ]]; then
    echo "- Test sign up request with existing user failed. Expected server code 100, got ${code}"
else
    echo "+ Test sign up request with existing user passed"
fi

############################################
# Endpoint: signup
# Action: Send invalid email
# Expected Response: 500
############################################
code=$(curl -XPOST localhost:3002/api/signup -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde12345","email":"abcde12345@!gmail.com","password":"defaultpass"}}' | jq '.code')
if [[ ! $code -eq 500 ]]; then
    echo "- Test sign up request with invalid email failed. Expected server code 500, got ${code}"
else
    echo "+ Test sign up request with invalid email passed"
fi

############################################
# Endpoint: signup
# Action: Send invalid username
# Expected Response: 500
############################################
code=$(curl -XPOST localhost:3002/api/signup -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde!12345","email":"abcde12345@gmail.com","password":"defaultpass"}}' | jq '.code')
if [[ ! $code -eq 500 ]]; then
    echo "- Test sign up request with invalid username failed. Expected server code 500, got ${code}"
else
    echo "+ Test sign up request with invalid username passed"
fi

############################################
# Endpoint: login
# Action: Send invalid username
# Expected Response: 401
############################################
code=$(curl -XPOST localhost:3002/api/login -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde1234567890@gmail.com","password":"defaultpass"}}' | jq '.code')
if [[ ! $code -eq 401 ]]; then
    echo "- Test log in request with invalid username failed. Expected server code 401, got ${code}"
else
    echo "+ Test log in request with invalid username passed"
fi

############################################
# Endpoint: login
# Action: Send invalid password, valid user
# Expected Response: 401
############################################
code=$(curl -XPOST localhost:3002/api/login -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde12345@gmail.com","password":"defaultpasssssss"}}' | jq '.code')
if [[ ! $code -eq 401 ]]; then
    echo "- Test log in request with invalid password failed. Expected server code 401, got ${code}"
else
    echo "+ Test log in request with invalid password passed"
fi

############################################
# Endpoint: login
# Action: Send valid username and password
# Expected Response: 200, session token
############################################
code=$(curl -XPOST localhost:3002/api/login -sH 'Content-Type: application/json' -d '{"user":{"username":"abcde12345@gmail.com","password":"defaultpass"}}' | jq '.code')
if [[ ! $code -eq 200 ]]; then
    echo "- Test log in request with valid account failed. Expected server code 200, got ${code}"
else
    echo "+ Test log in request with valid account passed"
fi
