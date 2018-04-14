const AWS = require('aws-sdk');
const cheerio = require('cheerio');
const moment = require('moment');
const docs = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const PRO_LEVEL = "Pro";
const ASSOCIATE_LEVEL = "Associate";
const DEVOPS_TRACK = "DevOps";
const SA_TRACK = "Solutions Architect";
const req = require('request');

function nameToEmail(name) {
    return name.replace(" ", ".").toLowerCase() + "@parivedasolutions.com";
}

function extractListingsFromHTML (html, certId, slackUserId, tableName, slackToken, callback) {
    const $ = cheerio.load(html);
    let found = false;
    let notFound = $('.pmError').text();
    //console.log('length is' + notFound.length);
    if (notFound.length > 0) {
        //notFound = notFound.slice(1,-1);
        let response = {
            found: found,
            message: notFound
        };
        console.log(response);
        return response;
    }
    else {
        let certObject;
        certObject = {
            found: true,
            message: "junk"
        };
        let name = $('#contentText fieldset h1').text();
        let likelyEmail = nameToEmail(name);
        console.log("Email assumed to be: " + likelyEmail);
        // make sure the name is very likely to be a Fin
        req.post("https://slack.com/api/users.lookupByEmail", {
            auth: {
                bearer: slackToken
            },
            form: {
                token: slackToken,
                email: likelyEmail,
            }
        }, function (error, response, body) {
            if (error) {
                console.log("SLACK EMAIL RETRIEVAL ERROR - " + error);
            } else {
                // console.log(JSON.stringify(response.body));
                let profile = JSON.parse(response.body);
                // console.log(JSON.stringify(profile));
                if (profile.ok) {
                    console.log("Looks like a Fin: " + profile.user.real_name);
                    let awsCert = $('#contentText fieldset h2').text();
                    let certStatus = $('#contentText fieldset div p big').text();
                    let expiration = $('#contentText fieldset div p').text();
                    expiration = expiration.replace(/\n/g, "");
                    expiration = expiration.replace(/\t/g, "");
                    expiration = expiration.replace(certStatus, "");
                    expiration = expiration.replace(",", "");
                    let dateParts = expiration.split(" ");
                    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                    ];
                    console.log('date is ' + dateParts[0]);
                    let monthNumber = (monthNames.indexOf(dateParts[0])) + 1;
                    let year = dateParts[2];
                    let day = dateParts[1];
                    let starts = moment(year + '-' + monthNumber + '-' + day, 'YYYY-MM-DD');
                    //console.log(starts);
                    var ends = starts.clone().add(2, 'year').subtract(1, 'day');
                    //console.log(ends);



                    // Make a couple things more friendly:
                    let level = "Unknown";
                    let track = "Unknown";
                    //let isSA = '0';
                    if (awsCert === "AWS Certified DevOps Engineer - Professional") {
                        level = PRO_LEVEL;
                        track = DEVOPS_TRACK;
                    }
                    else if (awsCert === "AWS Certified Developer - Associate") {
                        level = ASSOCIATE_LEVEL;
                        track = "Both";
                    }
                    // TODO - add remaining certs
                    //else if (awsCert === "")

                    docs.put({
                        TableName: tableName,
                        Item : {
                            certKey: certId,
                            timestamp: "" + new Date().getTime().toString(),
                            //userName: inputParams.user_name,
                            fin: name,
                            email: likelyEmail,
                            slack_user_id_logged_by: slackUserId,
                            slack_user_id_earned_by: profile.user.id,
                            // level: slackInfo.profile.fields.Xf1M339XQX.value, // Level
                            // office: slackInfo.profile.fields.Xf1LTXNG6P.value, // Office
                            cert: awsCert,
                            level: level,
                            track: track,
                            cert_status: certStatus,
                            starts: starts.unix(),
                            expires: ends.unix(),
                        }
                    }, function(err, data) {
                        if (err) {
                            console.log("Error saving cert: " + err, null);
                        }
                        else {
                            console.log("Cert info saved to DynamoDB");
                            certObject.message = "Congrats, " + name + "!\nYour '" + awsCert + "' cert is logged, safe and sound. Great work!";
                        }
                        callback(null, certObject);
                    });

                    console.log(JSON.stringify(certObject));
                }
                else {
                    certObject.found = false;
                    certObject.message = "There doesn't seem to be a fin with email " + likelyEmail + ".\nIf you think this is a mistake, contact #aws-certbot-support";
                    console.log("Not a Fin: " + likelyEmail);
                    callback(null, certObject);

                }

            }
        });
    }

}

module.exports = {
    extractListingsFromHTML
};