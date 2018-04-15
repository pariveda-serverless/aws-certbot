const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const token = process.env['VERIFICATION_TOKEN'];
const qs = require('querystring');
const req = require('request');
const json2csv = require('json2csv');

const decryptedSlackAuthToken = process.env['SLACK_APP_AUTH_TOKEN'];

function getTimestamp() {
    var dateObj = new Date();
    var hour = ('0' + dateObj.getHours()).slice(-2);
    var minute = ('0' + dateObj.getMinutes()).slice(-2);
    var second = ('0' + dateObj.getSeconds()).slice(-2);
    var month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
    var day = ('0' + dateObj.getDate()).slice(-2);
    var year = dateObj.getFullYear();
    var timestamp = year + month + day + hour + minute + second;
    return timestamp;
}

function sendSlashCommandResponse(callback) {
    var successMessage = {
        "text": "A CSV file will be sent to you momentarily..."
    };
    var response = {
        statusCode: 200,
        body: JSON.stringify(successMessage)
    };
    callback(null, response);
}

function processEvent(event, context, callback) {
    //console.log(JSON.stringify(event, null, '  '));

    var inputParams = qs.parse(event.body);
    var timestamp = "" + new Date().getTime().toString();
    var requestToken = inputParams.token;
    var slackUserId = inputParams.user_id;

    if (requestToken != token) {
        console.error("Request token (" + requestToken + ") does not match expected token for Slack");
        context.fail("Invalid request token");
    }

    sendSlashCommandResponse(callback);

    var slackValues = inputParams.text;

    const fields = ['certKey', 'cert', 'fin', 'email', 'level', 'track', 'expires'];
    var params = {
        TableName : process.env.TABLE
    };

    docs.scan(params, function(err, data) {
        if (err) {
            console.log('ERROR RETRIEVING DYNAMODB DATA: ' + err);
        }
        else {
            var csv = json2csv({ data: data.Items, fields: fields });

            req.post("https://slack.com/api/files.upload", {
                auth: {
                    bearer: decryptedSlackAuthToken
                },
                form: {
                    token: decryptedSlackAuthToken,
                    content: csv,
                    filetype: "csv",
                    filename: "AWS_Certs_" + getTimestamp() + ".csv",
                    title: "AWS Cert Data",
                    initial_comment: "Here's the AWS certification data you requested :fintastic:",
                    channels: "@" + inputParams.user_name//"@slackbot"
                }
            }, function(error, response, body) {
                if(error){
                    console.log("SLACK FILE UPLOAD ERROR - " + error, null);
                } else {
                    console.log('slack file upload response', response);
                    console.log('great success', response);
                }
            });
        }
    });
}

exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);
};