const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const qs = require('querystring');
const lambda = new AWS.Lambda();
const TABLE = process.env['TABLE'];
const SERVICE_AND_STAGE = process.env['SERVICE_AND_STAGE'];
// See https://api.slack.com/docs/token-types#verification
const token = process.env['VERIFICATION_TOKEN'];
const EPHEMERAL = "ephemeral";
const CHANNEL = "in_channel";
let checkingAWSMessage = {
    "response_type": EPHEMERAL,
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
        FunctionName: SERVICE_AND_STAGE + '-postCert', // the lambda function we are going to invoke
        InvocationType: 'Event', // 'Event' is async, RequestResponse is synchronous
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    console.log('params:' + JSON.stringify(params));
    let slackValues = inputParams.text.split('%2C');

    let certid = (slackValues[0] !== null ? slackValues[0].toString() : "").trim();

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
                let certDetails = data.Item.fin.S + '\'s ' + data.Item.cert.S + ' cert is already logged.\nIf you\'re hungry for data, try /aws-cert-data';
                let alreadyLogged = {
                    "response_type": EPHEMERAL,
                    "text": certDetails
                };

                let doingWorkMessage = {
                    statusCode: 200,
                    body: JSON.stringify(alreadyLogged)
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
                checkingAWSMessage.text = "Searching the Amazon jungle for cert with id '" + certid + "'...";
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