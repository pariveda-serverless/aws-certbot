const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const qs = require('querystring');
const req = require('request');
const lambda = new AWS.Lambda();
const decryptedSlackAuthToken = process.env['SLACK_APP_AUTH_TOKEN'];
// See https://api.slack.com/docs/token-types#verification
const token = process.env['VERIFICATION_TOKEN'];
const checkingAWSMessage = {
    "response_type": "ephemeral",
    "text": "Searching the Amazon jungle..."
};
/**
 *
 * @param event
 * @param context
 * @param callback
 */
function processEvent(event, context, callback) {


    var inputParams = qs.parse(event.body);
    var requestToken = inputParams.token;
    var slackUserId = inputParams.user_id;
    const responseUrl = inputParams.response_url;
    console.log('response url: ' + responseUrl);
    if (requestToken != token) {
        console.error("Request token (" + requestToken + ") does not match expected token for Slack");
        context.fail("Invalid request token");
    }

    var params = {
        FunctionName: 'aws-certbot-master-postCert', // the lambda function we are going to invoke
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    console.log('params:' + JSON.stringify(params));
    var slackValues = inputParams.text.split('%2C');
    slackValues = inputParams.text.split(',');

    var activityDate = new Date().toString();
    var certid = (slackValues[0] !== null ? slackValues[0].toString() : "").trim();
    console.log('cert id is ' + certid);

    lambda.invoke(params, function(err, data) {
        if (err) {
            context.fail(err);
        } else {
            context.succeed('Lambda_B said '+ data.Payload);
        }
    });

    // tell slack we're good :)

    var doingWorkMessage = {
        statusCode: 200,
        body: JSON.stringify(checkingAWSMessage)
    };
    callback(null, doingWorkMessage);

}

module.exports.hello = (event, context, callback) => {
    processEvent(event, context, callback);
};