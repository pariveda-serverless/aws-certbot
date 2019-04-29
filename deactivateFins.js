const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const req = require('request');
const moment = require('moment');

const TABLE = process.env['TABLE'];
const decryptedSlackAuthToken = process.env['SLACK_APP_AUTH_TOKEN'];

const {getSlackProfileByEmail} = require('./helpers');

function processEvent(event, context, callback) {
    console.log(JSON.stringify(event, null, '  '));
    
    var params = {
        TableName : TABLE,
        FilterExpression : 'fin_active = :active',
        ExpressionAttributeValues : {':active' : 1}
    };
    docs.scan(params, function(err, data) {
        if (err) {
            console.log('ERROR RETRIEVING DYNAMODB DATA: ' + err);
        } else {
            for (var i = 0; i < data.Items.length; i++) {
                const record = data.Items[i];
                console.log("Checking if " + record.fin + " is still active at the company...");
                getSlackProfileByEmail(record.email, decryptedSlackAuthToken, function (error, response, body) {
                    if (error) {
                        console.log("SLACK EMAIL RETRIEVAL ERROR - " + error);
                    } else {
                        let profile = JSON.parse(response.body);
                        if (!profile.ok) {
                            console.log(record.fin + " is no longer active at the company.");

                            docs.update({
                                TableName: TABLE,
                                Key: { "certKey" : record.certKey },
                                UpdateExpression: 'set fin_active = :inactive, fin_deactivated_date = :today',
                                ExpressionAttributeValues: {
                                    ':inactive': 0,
                                    ':today' : moment().utc().format("MM/DD/YYYY")
                                }
                            }, function(err, data) {
                                if (err) {
                                    console.log("Error updating cert: " + err, null);
                                }
                                else {
                                    console.log(record.fin + " cert record deactivated.");
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}

exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);
};