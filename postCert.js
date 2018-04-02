const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const qs = require('querystring');
const req = require('request');

const decryptedSlackAuthToken = process.env['SLACK_APP_AUTH_TOKEN'];
// See https://api.slack.com/docs/token-types#verification
const token = process.env['VERIFICATION_TOKEN'];

function getActivityDate() {
    var dateObj = new Date();
    var month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
    var day = ('0' + dateObj.getDate()).slice(-2);
    var year = dateObj.getFullYear();
    var timestamp = month + "/" + day + "/" + year;
    return timestamp;
}

function processEvent(event, context, callback) {
    console.log(JSON.stringify(event, null, '  '));

    var inputParams = qs.parse(event.body);
    var requestToken = inputParams.token;
    var slackUserId = inputParams.user_id;

    if (requestToken != token) {
        console.error("Request token (" + requestToken + ") does not match expected token for Slack");
        context.fail("Invalid request token");
    }

    var slackValues = inputParams.text.split('%2C');
    slackValues = inputParams.text.split(',');

    var activityDate = new Date().toString();
    var certid = (slackValues[0] !== null ? slackValues[0].toString() : "").trim();

    req.post("https://slack.com/api/users.profile.get", {
        auth: {
            bearer: decryptedSlackAuthToken
        },
        form: {
            token: decryptedSlackAuthToken,
            user: slackUserId,
            include_labels: false
        }
    }, function(error, response, body) {
        if(error){
            callback("SLACK PROFILE RETRIEVAL ERROR - " + error, null);
        } else {
            var slackInfo = JSON.parse(response.body);
            console.log('slack info', slackInfo);
            var response = {
                statusCode: 200,
                body: JSON.stringify("yay")
            };
            callback(null, response);
            // docs.put({
            //     TableName: process.env.ACTIVITIES_TABLE,
            //     Item : {
            //         timestamp: "" + new Date().getTime().toString(),
            //         userName: inputParams.user_name,
            //         name: slackInfo.profile.real_name,
            //         // level: slackInfo.profile.fields.Xf1M339XQX.value, // Level
            //         // office: slackInfo.profile.fields.Xf1LTXNG6P.value, // Office
            //         date: getActivityDate(),
            //         contact: contact,
            //         company: company,
            //         event: event,
            //         rawText: inputParams.text
            //     }
            // }, function(err, data) {
            //     if (err) {
            //         callback(err + " " + body.timestamp, null);
            //     }
            //     else {
            //         var successMessage = {
            //             "response_type": "in_channel",
            //             "text": "Success!"
            //             + "\n*Fin*: " + slackInfo.profile.real_name
            //             + "\n*Contact*: " + certid,
            //         };
            //         console.log('great success: ' + JSON.stringify(successMessage));
            //         var response = {
            //             statusCode: 200,
            //             body: JSON.stringify(successMessage)
            //         };
            //         callback(null, response);
            //     }
            // });
        } // end else
    });
}
exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);
};