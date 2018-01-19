const mssql = require("mssql");
const nodemailer = require("nodemailer");
const shajs = require("sha.js");
const uuidv4 = require("uuid/v4");
const User = require("./configurations/config").DB_USER_CONFIG;
const adminEmail = require("./configurations/config").EMAIL_CONFIG;

class TDatabase {
	// Creates the connection to the database given the passed parameters.
	constructor(config) {
		const self = this;
		this.schema = config.schema;
		this.db = new mssql.ConnectionPool(config);
		this.db.connect((err) => {
			if (err) {
				self.printErrorDetails(err);
				process.exit(); // eslint-disable-line no-undef
			} else {
				console.log("Connected to database" + (config.database == "" ? " " : " " + config.database + " ") + "at " + config.server + ":" + config.port); // eslint-disable-line no-console
			}
		});
	}

	// Prints details given the passed error.
	printErrorDetails(err) {
		console.log(err); // eslint-disable-line no-console
		console.log(this); // eslint-disable-line no-console
		console.log("ErrorNo: " + err.number); // eslint-disable-line no-console
		console.log("Code: " + err.state); // eslint-disable-line no-console
		console.log("Call: " + err.procname); // eslint-disable-line no-console
		console.log("Class: " + err.class); // eslint-disable-line no-console
	}

	// Sends a confirmation email to the user to confirm the email used to create their account.
	confirmationEmail (data) {
		var transporter = nodemailer.createTransport({
			service: "Gmail",
			auth: {
				user: adminEmail.username,
				pass: "xiaozhu541"
			}
		});
		let HelperOptions = {
			from: "Education For Revitalization <" + adminEmail.username + ">",
			to: data.email,
			subject: "Account Confirmation",
			html: "<p>Hello " + data.name + ",</p>" +
                  "<p style='margin-left: 20px'>Thanks for signing up for Education for Revitalization.</p>" +
                  "<p style='margin-left: 20px'>Please click on the following verify address to activate your account: </p>" +
                  "<p style='margin-left: 20px'>Email: <span style='margin-left: 100px'>" + data.email + "</span></p>" +
                  "<p style='margin-left: 20px'>Verify: <span style='margin-left: 100px'><a href='https://efrweb.firebaseapp.com'>TestURL</a></span></p>" +
                  "<p style='margin-left: 20px'>If you haven't already, install our app for <a href='https://efrweb.firebaseapp.com'>TestURL</a></span></p>" +
                  "<p style='margin-left: 20px'>If you have any questions, please <a href='https://efrweb.firebaseapp.com' target='_blank' style='color: #15c'>Contact Us</span>.</p>" +
                  "<p>Sincerely,</p>" +
                  "<p style='font-size: 90%;'>The E4R Team</p>"
		};
		transporter.sendMail(HelperOptions, (err)=>{
			if(err) {
				console.log("Confirmation Email failed: " + data.email); // eslint-disable-line no-console
				return false;
			}
		});
		console.log("Confirmation Email Sent: " + data.email); // eslint-disable-line no-console
	}

	// Verifies a user's email via regex.
	isEmail (data) {
		let check = false;
		const format = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum|edu)\b/;
		if (format.test(data)) {
			check = true;
		}
		return check;
	}

	// Verifies an email has no special characters
	hasSpecialChar (data) {
		let check = false;
		const format = /[ !#$%^&*()_+\-=[\]{};':"\\|,<>/?]+/;
		if (format.test(data)) {
			check = true;
		}
		return check;
	}

	// Sanitizes user input.
	sanitizeInput (data) {
		let check = false;
		const specialChar = this.hasSpecialChar(data);
		const verifyEmail = true;//this.isEmail(data);
		if (specialChar === false && verifyEmail === true) {
			check = true;
		}
		return check;
	}

	// Attempts to verify a user's existing token and renews it if valid, else logs the user out.
	//
	// Example:
	// curl -XPUT localhost:3002/api/renew -H 'Content-Type: application/json' -d '{"user":{"session":"5a808320-6062-4193-9720-55046ff5"}}'
	renewSessionToken(client, data) {
		const self = this;
		this.db.request().input("username", mssql.NVarChar(User.EMAIL_LENGTH), data.username)
			.query("SELECT * FROM " + self.schema + ".Users WHERE EmailAddr = @username OR Username = @username;", (err, res) => {
				if (err) self.printErrorDetails(err);
				else if(res.recordset.length > 0){
					let uid = res.recordset[0].Username;
					let questions = res.recordset[0].UserObject;
					console.log(res.recordset);
					this.db.request().input("session", mssql.VarChar(32), data.session)
						.query("SELECT * FROM " + self.schema + ".Sessions WHERE SessionID = @session", (err, res)=> {
							if (err) self.printErrorDetails(err);
							else if(res.recordset.length > 0){
								client.json({"response": true,"uid": uid, "questions": questions});
							}
							else {
								client.json({"reason": "session not found"});
							}
						});
				}
				else {
					client.json({"reason": "user not found"});
				}
			});
		// this.db.request().input("token", mssql.VarChar(32), data.session)
		// 	.query("SELECT * FROM " + self.schema + ".Sessions WHERE SessionID = @token", (err, res) => {
		// 		if (res.rowsAffected == 0) {
		// 			client.json({response: "Failed", type: "GET", code: 403, action: "LOGOUT", reason: "User's session token was not found."});
		// 		} else {
		// 			this.db.request().input("token", mssql.VarChar(32), data.session)
		// 				.query("DELETE " + self.schema + ".Sessions WHERE SessionID = @token");

		// 			if (Date.parse(res.recordsets[0][0].ExpirationTime) < Date.now()) {
		// 				client.json({response: "Failed", type: "GET", code: 403, action: "LOGOUT", reason: "User's session token is invalid."});
		// 			} else {
		// 				let sessionid = self.setSessionID(res.recordsets[0][0].UserID);
		// 				client.json({response: "Success", type: "GET", code: 200, action: "RENEW_SESSION", session_id: sessionid});
		// 			}
		// 		}
		// 	});
	}

	// Sets a new session ID for a given user.
	setSessionID(userID) {
		const self = this;
		let sessionid = uuidv4();
		this.db.request().input("token", mssql.VarChar(32), sessionid)
			.query("SELECT * FROM " + self.schema + ".Sessions WHERE SessionID = @token", (err, res) => {
				if (err) {
					self.printErrorDetails(err);
				}
				if (res.rowsAffected != 0) {
					sessionid = self.setSessionID(userID);
				} else {
					this.db.request().input("sessionid", mssql.VarChar(32), sessionid)
						.input("exptime", mssql.DateTime2, new Date(Date.now()).toISOString())
						.input("userid", mssql.Int, userID)
						.query("INSERT INTO " + self.schema + ".Sessions VALUES (@sessionid, @exptime, @userid)");
				}
			});

		return sessionid;
	}

	// Attempts to log the user in given a certain username and Password
	//
	// Example:
	// curl -XPOST localhost:3002/api/login -H 'Content-Type: application/json' -d '{"user":{"username":"shaunrasmusen","password":"defaultpass"}}'
	attemptLogin (client, data) {
		const self = this;
		this.db.request().input("username", mssql.NVarChar(User.EMAIL_LENGTH), data.username)
			.query("SELECT * FROM " + self.schema + ".Users WHERE EmailAddr=@username OR Username=@username", (err, users) => {
				if (err) {
					self.printErrorDetails(err);
					console.log("LOGIN Fail"); // eslint-disable-line no-console
					client.json({response: "Failed", type: "GET" ,code: 500, reason: "Unknown database error", data: err});
				} else {
					if (users.rowsAffected > 0) {
					//TODO Update this with a call to the salt table
						let salt = "qoi43nE5iz0s9e4?309vzE()FdeaB420";
						let hashedPassword = shajs("sha256").update(data.password + salt).digest("hex");

						if (users.recordsets[0][0].PasswordHash === hashedPassword) {
							let sessionid = self.setSessionID(users.recordsets[0][0].UserID);
							this.db.request().input("username", mssql.NVarChar(User.USERNAME_LENGTH), users.recordsets[0][0].Username)
								.query("SELECT CAST(UserObject AS VARCHAR) AS UserObject FROM " + self.schema + ".Users WHERE Username=@username", (err, res) => {
									client.json({response: "Success", type: "GET", code: 200, action: "LOGIN", session_id: sessionid, user_object: res.recordsets[0][0].UserObject});
								});
						} else {
							client.json({response: "Failed", type: "GET", code: 403, reason: "Invalid Password"});
						}
					} else {
						client.json({response: "Failed", type: "GET", code: 403, reason: "User not found"});
					}
				}
			});
	}

	// Attempts to log the user out. If successful, user object will be saved,
	// and current session token will expire.
	//
	// curl -XPUT localhost:3002/api/logout -H 'Content-type: application/json' -d '{"user":{"session":"d5841d01-42d8-4caf-84d4-fa493c22156d", "userobject":"{}"}}'
	attemptLogout(client, data) {
		const self = this;
		this.db.request().input("token", mssql.VarChar(32), data.session)
			.query("SELECT * FROM " + self.schema + ".Sessions WHERE SessionID = @token", (err, res) => {
				if (res.rowsAffected == 0) {
					client.json({response: "Failed", type: "PUT", code: 500, reason: "Session invalid. User object could not be saved"});
				} else {
					this.db.request().input("token", mssql.VarChar(32), data.session)
						.query("DELETE " + self.schema + ".Sessions WHERE SessionID = @token");
					this.db.request().input("userobject", mssql.VarChar, data.userobject)
						.input("userid", mssql.Int, res.recordsets[0][0].UserID)
						.query("UPDATE " + self.schema + ".Users SET UserObject = CAST(@userobject AS VARBINARY(MAX)) WHERE UserID = @userid");
					client.json({response: "Success", type: "PUT", code: 200, reason: "User successfully logged out."});
				}
			});
	}

	// Attempts to create an account with the given username, email, and password
	//
	// Example:
	// curl -XPOST localhost:3002/api/signup -H 'Content-Type: application/json' -d '{"user":{"username":"shaunrasmusen","email":"shaunrasmusen@gmail.com","password":"defaultpass"}}'
	createAccount(client, data) {
		const self = this;
		const sanitized = self.sanitizeInput(data.email);
		console.log("SIGNUP Request"); // eslint-disable-line no-console
		if (sanitized === true) {
			this.db.request().input("email", mssql.NVarChar(User.EMAIL_LENGTH), data.email)
				.input("username", mssql.NVarChar(User.USERNAME_LENGTH), data.username)
				.query("SELECT * FROM " + self.schema + ".Users WHERE EmailAddr = @email OR Username = @username;", (err, users) => {
					if (err) {
						self.printErrorDetails(err);
						console.log("SIGNUP Error"); // eslint-disable-line no-console
						client.json({response: "Failed", type: "GET" ,code: 500, reason: "Search User error"});
					} else {
						if (users.rowsAffected > 0) {
							client.json({response: "Failed", type: "GET",code: 100, reason: "User already exists"});
						} else {
						//TODO Update this with a call to the salt table
							let salt = "qoi43nE5iz0s9e4?309vzE()FdeaB420";
							let hashedPassword = shajs("sha256").update(data.password + salt).digest("hex");

							this.db.request().input("username", mssql.NVarChar(User.USERNAME_LENGTH), data.username)
								.input("email", mssql.NVarChar(User.EMAIL_LENGTH), data.email)
								.input("password", mssql.NVarChar(User.PASSWORD_LENGTH), hashedPassword)
								.query("INSERT INTO " + self.schema + ".Users VALUES (@username, @email, @password, CAST('{}' AS VARBINARY(MAX)), NULL);", (err) => {
									if (err) {
										self.printErrorDetails(err);
										console.log("SIGNUP Error"); // eslint-disable-line no-console
										client.json({response: "Failed", type: "POST", code: 500, reason: "Create User error", data: err});
									} else {
										console.log("SIGNUP SUCCEED Email: " + data.email ); // eslint-disable-line no-console
										client.json({response: "Succeed", type: "POST", code: 201, action: "SIGNUP"});
										//self.confirmationEmail(data);
									}
								});
						}
					}
				});
		} else {
			client.json({response: "Rejected", Code: 500, reason: "Invalid Email"});
		}
	}

	// Displays all current user accounts from the database.
	// TODO Remove in production.
	//
	// curl -XGET localhost:3002/api/test/display
	displayUsers(client) {
		const self = this;
		this.db.request().query("SELECT * FROM " + self.schema +".Users", (err, result) => {
			if (err) {
				self.printErrorDetails(err);
				console.log("GET Error"); // eslint-disable-line no-console
				client.json({response: "Failed", type: "GET", code: 404, reason: err});
			} else {
				this.db.request().query("SELECT * FROM " + self.schema + ".Sessions", (err,res)=>{
					if(err) self.printErrorDetails(err);
					client.json({response: "Successful", type: "GET" ,code: 200, action: "DISPLAY", userCount: result.length, token: res.recordset[0].SessionID,result: result.recordset});
				});
			}
		});
	}

	// Ensures that the database connection is closed on object destruction.
	gracefulShutdown() {
		this.db.close();
	}
}

module.exports = TDatabase; // eslint-disable-line no-undef
