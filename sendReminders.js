const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const req = require('request');
const moment = require('moment');

const TABLE = process.env['TABLE'];
const decryptedSlackAuthToken = process.env['SLACK_APP_AUTH_TOKEN'];
const POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";

const reminderDays = process.env['REMINDER_DAYS'] || "90";
const REMINDER_DAYS_ARRAY = reminderDays.split(",");

function processEvent(event, context, callback) {
    console.log(JSON.stringify(event, null, '  '));
    
    
    for (var i = 0; i < REMINDER_DAYS_ARRAY.length; i++) {
        const reminderDays = REMINDER_DAYS_ARRAY[i];
        const reminderDayTimestamp = moment().utc().hours(0).minutes(0).seconds(0).milliseconds(0).add(reminderDays, 'days').unix()
        console.log("Sending reminders for certifications expiring in " + reminderDays + " days (timestamp: " + reminderDayTimestamp + ").")

        var params = {
            TableName : TABLE,
            FilterExpression : 'expires_timestamp = :notification_day_timestamp and fin_active = :active',
            ExpressionAttributeValues : {
                ':active': 1,
                ':notification_day_timestamp' : reminderDayTimestamp
            }
        };
        docs.scan(params, function(err, data) {
        if (err) {
            console.log('ERROR RETRIEVING DYNAMODB DATA (timestamp: ' + reminderDayTimestamp + '): ' + err);
        }
        else {
            if (data.Items.length > 0) {
                for (var j = 0; j < data.Items.length; j++) {
                    const record = data.Items[j];
                    const messageText = "Hi " + record.fin + ", this is a friendly reminder that your " + record.cert + " certification will expire in " + reminderDays + " days. :nerd_face:";
                    const slackUserId = record.slack_user_id_earned_by;
    
                    sendSlackMessage(slackUserId, messageText, function(error, response) {
                        if (error) {
                            console.log("Error sending Slack message to " + record.fin + " (Slack ID: " + slackUserId + " / Expiring: " + reminderDays + " days): " + error);
                        } else {
                            console.log("Expiration reminder Slack message successfully sent to " + record.fin + " (expiring in " + reminderDays + " days)");
                        }
                    });
                }
            } else {
                console.log("No logged certifications are expiring in " + reminderDays + " days.");
            }
        }
        });
    }
}

function sendSlackMessage(slackUserId, messageText, callback) {
    req.post(POST_MESSAGE_URL, {
        auth: {
            bearer: decryptedSlackAuthToken
        },
        form: {
            token: decryptedSlackAuthToken,
            channel: slackUserId,
            text: messageText
        }
    }, function (error, response, body) {
        if (error) {
          callback(error);
        } else {
          const response = JSON.parse(body);
          if (response.ok) {
            callback(null, response);
          } else {
            const errorMessage = "Send unsuccessful - " + response.error;
            callback(errorMessage);
          }
        }
    });
  }

exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);
};