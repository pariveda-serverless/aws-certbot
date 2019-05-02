const req = require('request');

const decryptedSlackBotAuthToken = process.env['SLACK_APP_AUTH_TOKEN'];
const decryptedSlackUserAuthToken = process.env['SLACK_APP_USER_AUTH_TOKEN'];

const OFFICE_SLACK_CUSTOM_FIELD_ID = process.env['OFFICE_SLACK_CUSTOM_FIELD_ID'];
const COHORT_SLACK_CUSTOM_FIELD_ID = process.env['COHORT_SLACK_CUSTOM_FIELD_ID'];

function processEvent(event, context, callback) {
    console.log(JSON.stringify(event, null, '  '));
    
    const email = event.queryStringParameters.email;
    console.log("Looking for email " + email);

    req.post("https://slack.com/api/users.lookupByEmail", {
        auth: {
            bearer: decryptedSlackBotAuthToken
        },
        form: {
            token: decryptedSlackBotAuthToken,
            email: email,
        }
    }, function (lookupError, lookupResponse, lookupBody) {
        if (lookupError) {
            const errorMessage = "SLACK EMAIL RETRIEVAL ERROR - " + lookupError;
            console.log("Error message:" + errorMessage);
            callback(null, {
                statusCode: 500,
                body: JSON.stringify({
                    message: errorMessage
                })
            });
        } else {
            const lookup = JSON.parse(lookupResponse.body);
            if (lookup.ok) {
                const name = lookup.user.real_name;
                console.log("Email found, belongs to " + name);

                if (OFFICE_SLACK_CUSTOM_FIELD_ID || COHORT_SLACK_CUSTOM_FIELD_ID) {
                    const slackId = lookup.user.id;
                    console.log("Getting profile custom fields for user ID " + slackId + "...");
                    
                    req.post("https://slack.com/api/users.profile.get", {
                        auth: {
                            bearer: decryptedSlackUserAuthToken
                        },
                        form: {
                            token: decryptedSlackUserAuthToken,
                            user: slackId,
                        }
                    }, function (profileError, profileResponse, profileBody) {
                        if (profileError) {
                            const errorMessage = "SLACK PROFILE RETRIEVAL ERROR - " + profileError;
                            console.log("Error message:" + errorMessage);
                            callback(null, {
                                statusCode: 500,
                                body: JSON.stringify({
                                    message: errorMessage
                                })
                            });
                        } else {
                            console.log("Found user profile");
                            const profile = JSON.parse(profileResponse.body);

                            const completeProfile = Object.assign({}, lookup.user.profile, profile.profile);

                            const returnObject = lookup;
                            returnObject.user.profile = completeProfile;

                            const returnString = JSON.stringify(returnObject);
                            console.log("Return object (success):" + returnString);
                            
                            callback(null, {
                                statusCode: 200,
                                body: returnString
                            });
                        }
                    });
                } else {
                    const returnString = JSON.stringify(lookup);
                    console.log("Return object (success):" + returnString);
                    
                    callback(null, {
                        statusCode: 200,
                        body: returnString
                    });
                }
            } else {
                // user not found by email
                callback(null, {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: "Email not found"
                    })
                });
            }
        }
    });
}

exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);
};