const mssql = require('mssql');
const nodemailer = require('nodemailer');
const shajs = require('sha.js');
const uuidv4 = require('uuid/v4');
const User = require('./configurations/config').DB_USER_CONFIG;
const DEFAULT_USER_OBJECT = require('./configurations/config').DEFAULT_USER_OBJECT;
const adminEmail = require('./configurations/config').EMAIL_CONFIG;
const SERVER_HOSTNAME = "http://e4rdb.cz5nhcw7ql0u.us-west-2.rds.amazonaws.com:3200"

class TDatabase {
	// Creates the connection to the database given the passed parameters.
    constructor(config) {
        this.db = new mssql.ConnectionPool(config);
      	this.db.connect((err) => {
            if (err) {
            } else {
                console.log('Connected to database' + (config.database == '' ? ' ' : ' ' + config.database + ' ') + 'at ' + config.server + ':' + config.port);
            }
        });
    }

	// Prints details given the passed error.
	printErrorDetails(err) {
		console.log("ErrorNo: " + err.number);
		console.log("Code: " + err.state);
		console.log("Call: " + err.procname);
		console.log("Class: " + err.class);
	}

	// Sends a confirmation email to the user to confirm the email used to create their account.
    confirmationEmail (data, id) {
        var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: adminEmail.username,
                pass: adminEmail.password
            }
            });
        let HelperOptions = {
            from: "Education For Revitalization <" + adminEmail.username + ">",
            to: data.email,
            subject: "Account Confirmation",
            html: "<p>Hello " + data.username + ",</p>" +
                  "<p style='margin-left: 20px'>Thanks for signing up for Education for Revitalization.</p>" +
                  "<p style='margin-left: 20px'>Please click on the following verify address to activate your account: </p>" +
                  "<p style='margin-left: 20px'>Email: <span style='margin-left: 100px'>" + data.email + "</span></p>" +
                  "<p style='margin-left: 20px'>Verify: <span style='margin-left: 100px'><a href='" + SERVER_HOSTNAME + "/api/verify_email/" + id + "'>http://beagoodperson.co/verify_email</a></span></p>" +
                  "<p style='margin-left: 20px'>If you haven't already, install our app for <span style='color: #15c'>Android</span></p>" +
                  "<p style='margin-left: 20px'>If you have any questions, please <span style='color: #15c'>Contact Us</span>.</p>" +
                  "<p>Sincerely,</p>" +
                  "<p style='font-size: 90%;'>The E4R Team</p>"
        };
        transporter.sendMail(HelperOptions, (err, response)=>{
            if(err) {
                console.log('Confirmation Email failed: ' + data.email);
                return false;
            }
        });
        console.log("Confirmation Email Sent: " + data.email);
    }

	// Verifies an email has no special characters
    hasSpecialChar (data) {
        let check = false;
        const format = /[ !#$%^&*()_+\-=\[\]{};':"\\|,<>\/?]+/;
        if (format.test(data)) {
            check = true;
        }
        return check;
    }

	// Sanitizes user input.
    sanitizeInput (data) {
        let check = false;
        const specialChar = this.hasSpecialChar(data);
        if (specialChar === false) {
            check = true;
        }
        return check;
    }

    // Attempts to create an account with the given username, email, and password
	//
	// Example:
	// curl -XPOST localhost:3002/api/signup -H 'Content-Type: application/json' -d '{"user":{"username":"shaunrasmusen","email":"shaunrasmusen@gmail.com","password":"defaultpass"}}'
    async createAccount(client, data) {
        const sanitized = this.sanitizeInput(data.email);
        console.log("SIGNUP Request");
        if (sanitized === true) {
            try {
                let res = await this.db.request().input('email', mssql.NVarChar(User.EMAIL_LENGTH), data.email)
                            						.input('username', mssql.NVarChar(User.USERNAME_LENGTH), data.username)
                            						.query("SELECT * FROM EFRAcc.Users WHERE EmailAddr = @email OR Username = @username;");

                if (res.rowsAffected > 0) {
                    client.json({response: "Failed", type: "POST",code: 100, reason: "User already exists"});
                } else {
                    //TODO Update this with a call to the salt table
                    let salt = "qoi43nE5iz0s9e4?309vzE()FdeaB420"
                    let hashedPassword = shajs('sha256').update(data.password + salt).digest('hex');

                    let newUserObject = Object.assign({}, DEFAULT_USER_OBJECT);
                    newUserObject.user_data.username = data.username;
                    newUserObject.user_data.email = data.email;

                    var date = new Date();
                    newUserObject.timestamp = date.toISOString();

                    var uostring = JSON.stringify(newUserObject);
                    uostring = uostring.replace("\\", "");

                    await this.db.request().input('username', mssql.NVarChar(User.USERNAME_LENGTH), data.username)
                                            .input('email', mssql.NVarChar(User.EMAIL_LENGTH), data.email)
                                            .input('password', mssql.NVarChar(User.PASSWORD_LENGTH), hashedPassword)
                                            .input('newuo', mssql.VarChar(5000), uostring)
                                            .query("INSERT INTO EFRAcc.Users VALUES (@username, @email, @password, CAST(@newuo AS VARBINARY(MAX)), NULL);");

                    var randNum = Math.round((Math.random() * 1000000000) % 2147483647);
                    let res = await this.db.request().input('username', mssql.NVarChar(User.USERNAME_LENGTH), data.username)
                                                        .input('email', mssql.NVarChar(User.EMAIL_LENGTH), data.email)
                                                        .query("SELECT UserID FROM EFRAcc.Users WHERE Username = @username AND EmailAddr = @email");

                    let res2 = await this.db.request().input('userid', mssql.NVarChar(User.USERNAME_LENGTH), res.recordsets[0][0].UserID)
                                                        .input('recoveryid', mssql.Int, randNum)
            				                            .query("INSERT INTO EFRAcc.PasswordRecovery VALUES (@recoveryid, @userid)");

                    console.log('SIGNUP SUCCEED Email: ' + data.email);
                    client.json({response: "Succeed", type: "POST", code: 201, action: "SIGNUP", verifyID: randNum});
                    this.confirmationEmail(data, randNum);
                }
            } catch (err) {
                console.log("SIGNUP Error");
                console.log(err);
                client.json({response: "Failed", type: "POST", code: 500, reason: "User signup error", data: err});
            }
        } else {
            client.json({response: "Rejected", type: "POST", code: 500, reason: "Invalid Email"});
        }
    }

    // Attempts to create an account with the given username, email
	//
	// Example:
	// curl -XPOST localhost:3002/api/check_username -H 'Content-Type: application/json' -d '{"user":{"username":"shaunrasmusen","email":"shaunrasmusen@gmail.com"}}'
    async checkUsername(client, data) {
        try {
            let res = await this.db.request().input('email', mssql.NVarChar(User.EMAIL_LENGTH), data.email)
                                            .input('username', mssql.NVarChar(User.USERNAME_LENGTH), data.username)
                                            .query("SELECT * FROM EFRAcc.Users WHERE EmailAddr = @email OR Username = @username;");

            if (res.rowsAffected > 0) {
                client.json({response: "Failed", type: "GET", code: 100, reason: "User already exists"});
            } else {
                client.json({response: "Success", type: "GET", code: 200, reason: "User not found"});
            }
        } catch (err) {
            console.log("Database Error");
            client.json({response: "Failed", type: "GET" ,code: 500, reason: "Search User error"});
        }
    }

    // Attempts to create an account with the given username, email
	//
	// Example:
	// curl -XGET localhost:3002/api/verify_email/${VerifyID}
    async verifyEmail(client, data) {
        let res = await this.db.request().input('verifyid', mssql.Int, data.VerifyID)
                                            .query("DELETE FROM EFRAcc.PasswordRecovery WHERE RecoveryID = @verifyid");

        console.log(data.VerifyID);
        if (res.rowsAffected == 0) {
            client.json({response: "Failed", type: "GET", code: 100, reason: "That ID was not found."});
        } else {
            client.redirect("/login")
        }
    }

	// Attempts to log the user in given a certain username and Password
	//
	// Example:
	// curl -XPOST localhost:3002/api/login -H 'Content-Type: application/json' -d '{"user":{"username":"shaunrasmusen","password":"defaultpass"}}'
    async attemptLogin (client, data) {
        try {
            let res = await this.db.request().input('username', mssql.NVarChar(User.EMAIL_LENGTH), data.username)
    				.query("SELECT * FROM EFRAcc.Users WHERE EmailAddr=@username OR Username=@username");

            if (res.rowsAffected > 0) {
                let res2 = await this.db.request().input('userid', mssql.Int, res.recordsets[0][0].UserID)
        				                            .query("SELECT * FROM EFRAcc.PasswordRecovery WHERE UserID = @userid");

                if (res2.rowsAffected > 0) {
                    client.json({response: "Failed", type: "POST", code: 428, reason: "Email not verified, login failed"});
                    return;
                }

                //TODO Update this with a call to the salt table
                let salt = "qoi43nE5iz0s9e4?309vzE()FdeaB420"
                let hashedPassword = shajs('sha256').update(data.password + salt).digest('hex');

                if (res.recordsets[0][0].PasswordHash === hashedPassword) {
                    let sessionid = await this.setSessionID(res.recordsets[0][0].UserID);

                    try {
                        let user_object = await this.getUserObject(res.recordsets[0][0].UserID, data);

                        var uo = user_object;
                        client.json({response: "Success", type: "POST", code: 200, action: "LOGIN", session_id: sessionid, user_object: uo});
                    } catch (err) {
                        console.log(err);
                    }
                } else {
                    client.json({response: "Failed", type: "POST", code: 401, reason: "Invalid Password"});
                }
            } else {
                client.json({response: "Failed", type: "POST", code: 401, reason: "User not found"});
            }
        } catch (err) {
            console.log("LOGIN Fail");
            client.json({response: "Failed", type: "POST" ,code: 500, reason: "Unknown database error", data: err});
        }
    }

	// Attempts to verify a user's existing token and renews it if valid, else logs the user out.
	//
	// Example:
	// curl -XPUT localhost:3002/api/renew -H 'Content-Type: application/json' -d '{"user":{"session":"5a808320-6062-4193-9720-55046ff5dd3a"}}'
	async renewSessionToken(client, data) {
		let res = await this.db.request().input('token', mssql.VarChar(User.SESSION_TOKEN_LENGTH), data.session)
                                            .query("SELECT * FROM EFRAcc.Sessions WHERE SessionID = @token");

        if (res.rowsAffected == 0) {
			client.json({response: "Failed", type: "PUT", code: 401, action: "RENEW", reason: "User's session token was not found."});
		} else {
			this.db.request().input('token', mssql.VarChar(User.SESSION_TOKEN_LENGTH), data.session)
							.query("DELETE EFRAcc.Sessions WHERE SessionID = @token");

            var datenum = Date.now();
            datenum = datenum.toPrecision(datenum.toString().length - 3).valueOf();

			if (Date.parse(res.recordsets[0][0].ExpirationTime) < datenum) {
				client.json({response: "Failed", type: "PUT", code: 401, action: "RENEW", reason: "User's session token is invalid."});
			} else {
				let sessionid = await this.setSessionID(res.recordsets[0][0].UserID);

                try {
                    client.json({response: "Success", type: "PUT", code: 200, action: "RENEW", session_id: sessionid});
                } catch (err) {
                    console.log(err);
                    client.json({response: "Unknown Error occurred. Please try again.", type: "GET", code: 500});
                }
			}
		}
	}

	// Sets a new session ID for a given user.
	async setSessionID(userID) {
		let sessionid = uuidv4();
		let res = await this.db.request().input('token', mssql.VarChar(User.SESSION_TOKEN_LENGTH), sessionid)
                                            .query("SELECT * FROM EFRAcc.Sessions WHERE SessionID = @token");

        if (res.rowsAffected != 0) {
			sessionid = setSessionID(userID);
		} else {
			this.db.request().input('sessionid', mssql.VarChar(User.SESSION_TOKEN_LENGTH), sessionid)
							.input('exptime', mssql.DateTime2, new Date(Date.now()).toISOString())
							.input('userid', mssql.Int, userID)
							.query("INSERT INTO EFRAcc.Sessions VALUES (@sessionid, @exptime, @userid)");

            console.log(sessionid);
		}

		return sessionid;
	}

    // Attempts to verify a user's existing token and renews it if valid, else logs the user out.
	//
	// Example:
	// curl -XPUT localhost:3002/api/update_uo -H 'Content-Type: application/json' -d '{"user":{"session":"5a808320-6062-4193-9720-55046ff5dd3a", "userobject":{"user_data": {"username": "test1","email": "test@test.com","first_name": "John","last_name": "Doe","charity_name": "ACME Charity, LLC"},"game_data": {"subject_name": "Math","subject_id": "1","difficulty": "0","completed_blocks": []}, "timestamp":"2018-01-24T02:06:58+00:00"}}}'
	async update_uo(client, data) {
		let res = await this.db.request().input('token', mssql.VarChar(User.SESSION_TOKEN_LENGTH), data.session)
                                            .query("SELECT * FROM EFRAcc.Sessions WHERE SessionID = @token");

        if (res.rowsAffected == 0) {
			client.json({response: "Failed", type: "PUT", code: 401, action: "LOGOUT", reason: "User's session token was not found."});
		} else {
			if (Date.parse(res.recordsets[0][0].ExpirationTime) < Date.now()) {
				client.json({response: "Failed", type: "PUT", code: 401, action: "LOGOUT", reason: "User's session token is invalid."});
			} else {
                try {
                    let user_object = await this.getUserObject(res.recordsets[0][0].UserID, data);

                    var cliTimestamp = data.userobject.timestamp;
                    var dbTimestamp = user_object.timestamp;

                    if (cliTimestamp < dbTimestamp) {
                        var uo = user_object;
                        client.json({response: "Success", type: "PUT", code: 200, action: "RETRIEVE UO", reason: "User object out of date. Retrieving from database.", userobject: uo});
                    } else {
                        var uo = await persistUserObject(data.userobject, res.recordsets[0][0].UserID);

                        client.json({response: "Success", type: "PUT", code: 200, action: "SAVE UO", userobject: uo});
                    }
                } catch (err) {
                    console.log(err);
                    client.json({response: "Unknown Error occurred. Please try again.", type: "PUT", code: 500});
                }
			}
		}
	}

    // Retrieves the user object and ensures it was properly saved.
    async getUserObject(userid, data) {
        let res = await this.db.request().input('userid', mssql.Int, userid)
                                        .query("SELECT CAST(UserObject AS VARCHAR(5000)) AS UserObject FROM EFRAcc.Users WHERE UserID = @userid;");

        if (res.recordsets[0][0].UserObject == "[object Object]" || res.recordsets[0][0].UserObject == "{}") {
            console.log("ERROR: Invalid User Object was saved.");


            let newUserObject = Object.assign({}, DEFAULT_USER_OBJECT);
            newUserObject.user_data.username = data.username;
            newUserObject.user_data.email = data.email;

            var uostring = JSON.stringify(newUserObject);
            uostring = uostring.replace("\\", "");

            await this.db.request().input('userobject', mssql.VarChar, uostring)
                                    .input('userid', mssql.Int, userid)
                                    .query("UPDATE EFRAcc.Users SET UserObject = CAST(@userobject AS VARBINARY(MAX)) WHERE UserID = @userid");

            console.log("updated uo");

            return newUserObject;
        }

        return JSON.parse(res.recordsets[0][0].UserObject);
    }

    async persistUserObject(uo, userid) {
        var date = new Date();
        uo.timestamp = date.toISOString();

        var uostring = JSON.stringify(uo);
        uostring = uostring.replace("\\", "");

        await this.db.request().input('userobject', mssql.VarChar(5000), uostring)
                                .input('userid', mssql.Int, userid)
                                .query("UPDATE EFRAcc.Users SET UserObject = CAST(@userobject AS VARBINARY(MAX)) WHERE UserID = @userid");

        return uo;
    }

	// Attempts to log the user out. If successful, user object will be saved,
	// and current session token will expire.
	//
	// curl -XPUT localhost:3002/api/logout -H 'Content-type: application/json' -d '{"user":{"session":"d5841d01-42d8-4caf-84d4-fa493c22156d", "userobject":{}}}'
	async attemptLogout(client, data) {
		let res = await this.db.request().input('token', mssql.VarChar(User.SESSION_TOKEN_LENGTH), data.session)
                                            .query("SELECT * FROM EFRAcc.Sessions WHERE SessionID = @token");
        if (res.rowsAffected == 0) {
        	client.json({response: "Failed", type: "PUT", code: 500, reason: "Session invalid. User object could not be saved"});
        } else {
            try {
                let user_object = await this.getUserObject(res.recordsets[0][0].UserID, data);

                var cliTimestamp = data.userobject.timestamp;
                var dbTimestamp = user_object.timestamp;

                if (cliTimestamp < dbTimestamp) {
                    client.json({response: "Success", type: "PUT", code: 409, action: "LOGOUT", reason: "Out of date user object cannot be saved. User logged out"});
                } else {
                    var uo = await persistUserObject(data.userobject, res.recordsets[0][0].UserID);

                    await this.db.request().input('token', mssql.VarChar(User.SESSION_TOKEN_LENGTH), data.session)
                					.query("DELETE EFRAcc.Sessions WHERE SessionID = @token");
                	client.json({response: "Success", type: "PUT", code: 200, action: "LOGOUT", reason: "User successfully logged out."});
                }
            } catch (err) {
                console.log(err);
                client.json({response: "Unknown Error occurred. Please try again.", type: "PUT", code: 500});
            }
        }
	}

    // Attempts to log the user out. If successful, user object will be saved,
	// and current session token will expire.
	//
	// curl -XDELETE localhost:3002/api/delete_user -H 'Content-type: application/json' -d '{"user":{"session":"d5841d01-42d8-4caf-84d4-fa493c22156d"}}'
	async deleteUser(client, data) {
		let res = await this.db.request().input('token', mssql.VarChar(User.SESSION_TOKEN_LENGTH), data.session)
                                            .query("SELECT * FROM EFRAcc.Sessions WHERE SessionID = @token");

        if (res.rowsAffected == 0) {
        	client.json({response: "Failed", type: "DELETE", code: 401, action: "DELETE_USER", reason: "Session invalid, user logged out."});
        } else {
            try {
                await this.db.request().input('userid', mssql.Int, res.recordsets[0][0].UserID)
            					      .query("DELETE EFRAcc.Sessions WHERE UserID = @userid");
                await this.db.request().input('userid', mssql.Int, res.recordsets[0][0].UserID)
                		              .query("DELETE EFRAcc.Users WHERE UserID = @userid");

                client.json({response: "Success", type: "DELETE", code: 200, action: "DELETE_USER"})
            } catch (err) {
                console.log(err);
                client.json({response: "Unknown Error occurred. Please try again.", type: "DELETE", code: 500});
            }
        }
	}

    // Returns a new block of questions from the database
    //
    // Example:
    // curl -XPUT localhost:3002/api/q/request_block -H 'Content-Type: application/json' -d '{"user":{"session":"87014393-5e70-4c08-8671-a25e661f3d03", "userobject":{"user_data": {"username": "test1","email": "test@test.com","first_name": "John","last_name": "Doe","charity_name": "ACME Charity, LLC"},"game_data": {"subject_name": "Math","subject_id": "1","difficulty": "0","completed_blocks": []}, "timestamp":"2018-01-24T02:06:58+00:00"}}, "game": {"questions":
    //                                                                                      [{"QuestionID":{id},"QuestionText":"{text}","QuestionOne":"{answer1}","QuestionTwo":"{answer2}","QuestionThree":"{answer3}", "QuestionFour":"{answer4}","CorrectAnswer":"{correct_answer}","StatsOne":"{statsAnswer1}","StatsTwo":"{statsAnswer2}","StatsThree":"{statsAnswer3}","StatsFour":"{statsAnswer4}","QuestionBlockID":"{block_id}"},{...}]}}'
    async requestQuestionBlock(client, data, gameData) {
        try {
            data.userobject = await this.verifyQuestionBlocks(client, data);
        } catch (err) {
            client.json({response: "Failed", type: "GET", code: 500, reason: "Unknown user object verification error. Retry request"});
        }

        if (gameData != undefined) {
            try {
                var queryStr = "INSERT INTO EFRQuest.Questions (QuestionID,StatsOne,StatsTwo,StatsThree,StatsFour) VALUES ";

                for (var i = 0; i < gameData.questions.length; i++) {
                    queryStr = queryStr + "(" + gameData.questions[i].QuestionID + "," + gameData.questions[i].StatsOne + "," + gameData.questions[i].StatsTwo + "," + gameData.questions[i].StatsThree + "," + gameData.questions[i].StatsFour + ")";
                    if (i != gameData.questions.length - 1)
                        queryStr = queryStr + ",";
                }

                queryStr = queryStr + "ON DUPLICATE KEY UPDATE StatsOne=VALUES(StatsOne),StatsTwo=VALUES(StatsTwo),StatsThree=VALUES(StatsThree),StatsFour=VALUES(StatsFour)";

                console.log(queryStr);
                await this.db.request().query(queryStr);
            } catch (err) {
                console.log(err);
            }
        }

        let res = await this.db.request().input('difficulty', mssql.Int, data.userobject.game_data.difficulty)
                                                .input('subject_id', mssql.Int, data.userobject.game_data.subject_id)
                                                .query("SELECT DISTINCT QuestionBlockID FROM EFRQuest.QuestionsDB WHERE Difficulty = @difficulty AND SubjectID = @subject_id GROUP BY QuestionBlockID");

        var questionBlocks = res.recordset;
        var totalBlocks = questionBlocks.length;

        var missing_blocks = [];
        for (var i = 0; i < totalBlocks; i++) {
            if (!data.userobject.game_data.completed_blocks.includes(questionBlocks[i].QuestionBlockID))
                missing_blocks.push(i + 1);
        }

        var chosen_block = missing_blocks[Math.floor(Math.random() * missing_blocks.length)];

        let response = await this.db.request().input('blockid', mssql.Int, chosen_block)
                                                .query("SELECT * FROM EFRQuest.Questions WHERE QuestionBlockID = @blockid");

        var uo;

        if (data.userobject.gameData.blocksRemaining != undefined) {
            data.userobject.gameData.blocksRemaining = missing_blocks.length;

            uo = await persistUserObject(data.userobject, res.recordsets[0][0].UserID);
        } else {
            uo = data.userobject;
        }

        client.json({response: "Success", type: "PUT", code: 200, action: "RETRIEVE", question_block: response.recordset, userobject: uo});
    }

    // Verifies the user objects are in sync and corrects errors if they exist.
    async verifyQuestionBlocks(client, data) {
        let res = await this.db.request().input('token', mssql.VarChar(User.SESSION_TOKEN_LENGTH), data.session)
                                            .query("SELECT * FROM EFRAcc.Sessions WHERE SessionID = @token");

        if (res.rowsAffected == 0) {
	        client.json({response: "Failed", type: "GET", code: 403, action: "LOGOUT", reason: "User's session token was not found."});
	    } else {
            let user_object = await this.getUserObject(res.recordsets[0][0].UserID, data);

            var cliTimestamp = data.userobject.timestamp;
            var dbTimestamp = user_object.timestamp;

            if (cliTimestamp < dbTimestamp) {
                var spliceBlocks = data.userobject.game_data.completed_blocks.concat(user_object.game_data.completed_blocks)
                spliceBlocks = spliceBlocks.filter(function(item, i, ar){ return ar.indexOf(item) === i; });
                data.userobject.game_data.completed_blocks = spliceBlocks;

                var date = new Date();
                data.userobject.timestamp = date.toISOString();
            }

            var uostring = JSON.stringify(data.userobject);
            uostring = uostring.replace("\\", "");

            await this.db.request().input('userobject', mssql.VarChar(5000), uostring)
                                    .input('userid', mssql.Int, res.recordsets[0][0].UserID)
                                    .query("UPDATE EFRAcc.Users SET UserObject = CAST(@userobject AS VARBINARY(MAX)) WHERE UserID = @userid");
	    }

        return data.userobject;
    }

	// Displays all current user accounts from the database.
	// TODO Remove in production.
	//
	// curl -XGET localhost:3002/api/test/display
    displayUsers(client) {
      this.db.request().query("SELECT * FROM EFRAcc.Users", (err, res) => {
          if (err) {
              console.log("GET Error");
              client.json({response: "Failed", type: "GET", code: 404, reason: err});
          } else {
              client.json({response: 'Successful', type: "GET" ,code: 200, action: "DISPLAY", userCount: res.length, result: res.recordset});
          }
      });
    }

	// Ensures that the database connection is closed on object destruction.
	gracefulShutdown() {
		this.db.close();
	}
}

module.exports = TDatabase;
