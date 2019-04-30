const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const req = require('request');
const moment = require('moment');

const TABLE = process.env['TABLE'];
const GET_SLACK_PROFILE_SERVICE_URL = process.env['GET_SLACK_PROFILE_SERVICE_URL'];
const OFFICE_SLACK_CUSTOM_FIELD_ID = process.env['OFFICE_SLACK_CUSTOM_FIELD_ID'];
const COHORT_SLACK_CUSTOM_FIELD_ID = process.env['COHORT_SLACK_CUSTOM_FIELD_ID'];

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
                const fullGetSlackProfileServiceUrl = GET_SLACK_PROFILE_SERVICE_URL + "?email=" + record.email;
                req.get(fullGetSlackProfileServiceUrl, function (error, response) {
                    if (error) {
                        callback("SLACK PROFILE RETRIEVAL ERROR - " + error, null);
                    } else {
                        let profile = JSON.parse(response.body);

                        let needsUpdate = false;

                        let updateParams = {
                            TableName: TABLE,
                            Key: { "certKey" : record.certKey },
                            UpdateExpression: 'set',
                            ExpressionAttributeValues: { }
                        };

                        if (!profile.ok) { // Check if fin left the company
                            console.log(record.fin + " is no longer active at the company.");
                            needsUpdate = true;
                            updateParams.UpdateExpression = updateParams.UpdateExpression + " fin_active = :inactive, fin_deactivated_date = :today,";
                            updateParams.ExpressionAttributeValues[':inactive'] = 0;
                            updateParams.ExpressionAttributeValues[':today'] = moment().utc().format("MM/DD/YYYY");
                        } else { // Fin is still at the company
                            if (OFFICE_SLACK_CUSTOM_FIELD_ID) { // Check if office changed
                                const currentOffice = profile.user.profile.fields[OFFICE_SLACK_CUSTOM_FIELD_ID].value
                                const loggedOffice = record.office;
                                if (loggedOffice !== currentOffice) {
                                    console.log(record.fin + "'s office changed (Old: " + loggedOffice + "; New: " + currentOffice + ").");
                                    needsUpdate = true;
                                    updateParams.UpdateExpression = updateParams.UpdateExpression + " office = :office,";
                                    updateParams.ExpressionAttributeValues[':office'] = currentOffice;
                                }
                            }
                            if (COHORT_SLACK_CUSTOM_FIELD_ID) { // Check if cohort changed
                                const currentCohort = profile.user.profile.fields[COHORT_SLACK_CUSTOM_FIELD_ID].value
                                const loggedCohort = record.cohort;
                                if (loggedCohort !== currentCohort) {
                                    console.log(record.fin + "'s cohort changed (Old: " + loggedCohort + "; New: " + currentCohort + ").");
                                    needsUpdate = true;
                                    updateParams.UpdateExpression = updateParams.UpdateExpression + " cohort = :cohort,";
                                    updateParams.ExpressionAttributeValues[':cohort'] = currentCohort;
                                }
                            }
                        }

                        if (needsUpdate) {
                            updateParams.UpdateExpression = updateParams.UpdateExpression.replace(/,\s*$/, "");
                            console.log(JSON.stringify(updateParams));
                            docs.update(updateParams, function(err, data) {
                                if (err) {
                                    console.log("Error updating cert: " + err, null);
                                }
                                else {
                                    console.log(record.fin + " cert record updated.");
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