const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const qs = require('querystring');
const req = require('request');
const lambda = new AWS.Lambda();
const decryptedSlackAuthToken = process.env['SLACK_APP_AUTH_TOKEN'];
//const TABLE = process.env['TABLE'];
const TABLE = 'aws-certbot-master.master';
// See https://api.slack.com/docs/token-types#verification
const token = process.env['VERIFICATION_TOKEN'];
const EPHEMERAL = "ephemeral";
const CHANNEL = "in_channel";
const checkingAWSMessage = {
    "response_type": "ephemeral",
    "text": "Searching the Amazon jungle..."
};

function isEmptyObject(obj) {
    return !Object.keys(obj).length;
}
/**
 *
 * @param event
 * @param context
 * @param callback
 */
function processEvent(event, context, callback) {

    let inputParams = qs.parse(event.body);
    const requestToken = inputParams.token;
    let slackUserId = inputParams.user_id;
    const responseUrl = inputParams.response_url;
    console.log('response url: ' + responseUrl);
    if (requestToken !== token) {
        console.error("Request token (" + requestToken + ") does not match expected token for Slack");
        context.fail("Invalid request token");
    }

    let params = {
        FunctionName: 'aws-certbot-master-postCert', // the lambda function we are going to invoke
        InvocationType: 'Event', // 'Event' is async, RequestResponse is synchronous
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    console.log('params:' + JSON.stringify(params));
    var slackValues = inputParams.text.split('%2C');
    slackValues = inputParams.text.split(',');

    var activityDate = new Date().toString();
    var certid = (slackValues[0] !== null ? slackValues[0].toString() : "").trim();
    console.log('cert id is ' + certid);

    let ddbParams = {
        TableName: TABLE,
        Key: {
            'certKey' : {S: certid},
        },
        ProjectionExpression: 'cert,fin,cert_status,starts,expires'
    };

// Call DynamoDB to read the item from the table
    ddb.getItem(ddbParams, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            //console.log(data);
            if (!isEmptyObject(data)) {
                console.log("Success", data.Item.cert.S);
                let doingWorkMessage = {
                    statusCode: 200,
                    body: JSON.stringify(checkingAWSMessage)
                };
                callback(null, doingWorkMessage)
            }
            else {
                // we didn't find the cert, so we have work to do
                lambda.invoke(params, function(err, data) {
                    if (err) {
                        context.fail(err);
                    }
                });
                // this will fire first so we don't see a slack timeout
                let doingWorkMessage = {
                    statusCode: 200,
                    body: JSON.stringify(checkingAWSMessage)
                };
                callback(null, doingWorkMessage)
            }
        }
    });
}

module.exports.hello = (event, context, callback) => {
    processEvent(event, context, callback);
};