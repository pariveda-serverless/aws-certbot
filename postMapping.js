const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const qs = require('querystring');
const req = require('request');
const token = process.env['VERIFICATION_TOKEN'];
const MAPPING_TABLE = process.env['MAPPING_TABLE'];

const EPHEMERAL = "ephemeral";
const CHANNEL = "in_channel";

function processEvent(event, context, callback) {
    console.log(JSON.stringify(event, null, '  '));

    let inputParams = qs.parse(event.body);
    let requestToken = inputParams.token;
    let slackUserId = inputParams.user_id;
    const responseUrl = inputParams.response_url;
    console.log('response url: ' + responseUrl);


    if (requestToken !== token) {
        console.error("Request token (" + requestToken + ") does not match expected token for Slack");
        context.fail("Invalid request token");
    }

    let slackValues = inputParams.text.split(',');

    let name = (slackValues[0] !== null ? slackValues[0].toString() : "").trim();
    let email = (slackValues[1] !== null ? slackValues[1].toString() : "").trim();
    console.log('name is ' + name);
    console.log('email is ' + email);

    docs.put({
        TableName: MAPPING_TABLE,
        Item : {
            timestamp: "" + new Date().getTime().toString(),
            fin: name,
            email: email,
            slack_user_id_logged_by: slackUserId
        }
    }, function(err, data) {
        let options = {
            uri: responseUrl,
            method: 'POST',
            json: {
                "response_type": CHANNEL,
                "text": ""
            }
        };
        if (err) {
            console.log("Error saving mapping: " + err);
            options.json.text = ":grimacing: There was an error saving the email mapping, please try again later. :disappointed:";
        }
        else {
            // save successful
            console.log("Mapping saved to DynamoDB");
            options.json.text = ":tada: Email mapping for " + name + " (" + email + ") is logged, safe and sound. :smile:";
        }
        console.log("responds with: " + JSON.stringify(options));
        req(options, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log("great success!") // Print the shortened url.
            }
            else {
                console.log("Error responding to slack at: " + responseUrl);
                console.log("Has the URL been used more than 5 times or is older than 30 minutes?");
            }
        });
    });

    const doingWorkMessage = {
        statusCode: 200,
    };
    callback(null, doingWorkMessage)
}

exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);
};