const AWS = require('aws-sdk');
const cheerio = require('cheerio');
const moment = require('moment');
const docs = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const PRO_LEVEL = "Pro";
const ASSOCIATE_LEVEL = "Associate";
const DEVOPS_TRACK = "DevOps";
const SA_TRACK = "Solutions Architect";
const SPECIALTY_LEVEL = "Specialty";
const req = require('request');
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const SUPPORTED_CERTS = {
    "AWS Certified DevOps Engineer - Professional": {
        level: PRO_LEVEL,
        track: DEVOPS_TRACK
    },
    "AWS Certified Developer - Associate": {
        level: ASSOCIATE_LEVEL,
        track: DEVOPS_TRACK
    },
    "AWS Certified SysOps Administrator - Associate": {
        level: ASSOCIATE_LEVEL,
        track: DEVOPS_TRACK
    },
    "AWS Certified Solutions Architect - Professional": {
        level: PRO_LEVEL,
        track: SA_TRACK
    },
    "AWS Certified Solutions Architect - Associate": {
        level: ASSOCIATE_LEVEL,
        track: SA_TRACK
    },
    "AWS Certified Big Data - Specialty": {
        level: SPECIALTY_LEVEL,
        track: ""
    },
    "AWS Certified Advanced Networking - Specialty": {
        level: SPECIALTY_LEVEL,
        track: ""
    },
    "AWS Certified Alexa Skill Builder - Specialty": {
        level: SPECIALTY_LEVEL,
        track: ""
    },
    "AWS Certified Machine Learning - Specialty": {
        level: SPECIALTY_LEVEL,
        track: ""
    },
    "AWS Certified Security - Specialty": {
        level: SPECIALTY_LEVEL,
        track: ""
    }
};

function nameToEmail(name, mappingTableName, callback) {
    getNameEmailMapping(name, mappingTableName, function(err, result) {
        if (err) {
            console.log("Error getting name/email mapping: " + err);
            callback(error);
        } else {
            let email = result;
            if (email == null) {
                let cleanName = name.replace(".",""); // no periods in names
                email = cleanName.replace(/ /gi, ".").toLowerCase() + "@parivedasolutions.com";
            }
            callback(null, email);
        }
    });
}

function getNameEmailMapping(name, tableName, callback) {
    docs.get({
        TableName: tableName,
        Key: {
            "fin": name
        }
    }, function(err, data) {
        let email;
        if (!err && !Object.keys(data).length) {
            console.log("Didn't find a name match in DynamoDB");
        } else if (!err) {
            console.log("Found a name match in DynamoDB");
            email = data.Item.email;
        }
        callback(err, email);
    });
}

function extractPublicBadge(html) {
    const $p = cheerio.load(html);
    let type = $p('.badgeTitleSmall').text().trim();

    if (type.length <= 0) {
        console.log("Not found!")
        return { found: false }
    }
    else {
        console.log("cert is " + type);
        let name = "";
        let starts = "";
        let expires = "";
        $p('.badgeDetailsItemSmall').each(function(i, elem) {
            if (i === 2) {
                name = $p(this).text().trim();
                console.log("person is " + name);
            }
            else if (i === 3) {
                let startsText = $p(this).text().trim().replace(",", "");
                console.log('starts: ' + startsText);
                let dateParts = startsText.split(" ");

                //console.log('date is ' + dateParts[0]);
                let monthNumber = (monthNames.indexOf(dateParts[0])) + 1;
                let year = dateParts[2];
                let day = dateParts[1];
                starts = moment(year + '-' + monthNumber + '-' + day, 'YYYY-MM-DD');
                //console.log("earned " + earnedOn.format('MM/DD/YYYY'));
            }
            else if (i === 4) {
                let expiresText = $p(this).text().trim().replace(",", "");
                console.log('expires: ' + expiresText);
                let dateParts = expiresText.split(" ");

                //console.log('date is ' + dateParts[0]);
                let monthNumber = (monthNames.indexOf(dateParts[0])) + 1;
                let year = dateParts[2];
                let day = dateParts[1];
                expires = moment(year + '-' + monthNumber + '-' + day, 'YYYY-MM-DD');
                //expires = console.log("earned " + earnedOn.format('MM/DD/YYYY'));
            }
        });

        const certStatus = expires.diff(moment()) > 0 ? "Active" : "Expired"; // diff between expiration date and current date is greater than 0 means an Active cert

        return {
            found: true,
            fin: name,
            starts: starts,
            ends: expires,
            cert: type,
            certStatus: certStatus
        }
    }

}

function getNewCertObject(html) {
    const $ = cheerio.load(html);
    let name = $('#contentText fieldset h1').text();
    if (name.length <= 0) {
        console.log("Not found!")
        return { found: false }
    }
    else {
        let awsCert = $('#contentText fieldset h2').text();
        let certStatus = $('#contentText fieldset div p big').text();
        let expiration = $('#contentText fieldset div p').text();
        expiration = expiration.replace(/\n/g, "");
        expiration = expiration.replace(/\t/g, "");
        expiration = expiration.replace(certStatus, "");
        expiration = expiration.replace(",", "");
        let dateParts = expiration.split(" ");

        console.log('date is ' + dateParts[0] + ' ' + dateParts[1] + ', ' + dateParts[2]);
        let monthNumber = (monthNames.indexOf(dateParts[0])) + 1;
        let year = dateParts[2];
        let day = dateParts[1];
        let starts = moment(year + '-' + monthNumber + '-' + day, 'YYYY-MM-DD');
        //console.log(starts);
        let ends = starts.clone().add(3, 'year').add(1, 'day');
        return {
            found: true,
            fin: name,
            starts: starts,
            ends: ends,
            cert: awsCert,
            certStats: certStatus
        }
    }
}
function extractListingsFromHTML (html, certId, slackUserId, tableName, mappingTableName, slackToken, callback) {

    let certDetails = '';
    if (certId.toLowerCase().startsWith('https')) {
        certDetails = extractPublicBadge(html);
    }
    else {
        certDetails = getNewCertObject(html);
    }
    console.log(JSON.stringify(certDetails));
    let found = false;
    if (!certDetails.found) {
        //notFound = notFound.slice(1,-1);
        let response = {
            found: found,
            message: "Amazon couldn't find that cert. Please make sure you entered it correctly and try again."
        };
        callback(null, response);
    }
    else {
        let certObject;
        certObject = {
            found: true,
            message: "junk"
        };

        nameToEmail(certDetails.fin, mappingTableName, function(err, result) {
            if (!err) {
                let likelyEmail = result;
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
                            // Make a couple things more friendly:
                            let level = "Unknown";
                            let track = "Unknown";
                            //let isSA = '0';
                            if (SUPPORTED_CERTS[certDetails.cert]) {
                                level = SUPPORTED_CERTS[certDetails.cert].level;
                                track = SUPPORTED_CERTS[certDetails.cert].track;
                            }
                            
                            docs.put({
                                TableName: tableName,
                                Item : {
                                    certKey: certId,
                                    timestamp: "" + new Date().getTime().toString(),
                                    //userName: inputParams.user_name,
                                    fin: certDetails.fin,
                                    email: likelyEmail,
                                    slack_user_id_logged_by: slackUserId,
                                    slack_user_id_earned_by: profile.user.id,
                                    // level: slackInfo.profile.fields.Xf1M339XQX.value, // Level
                                    // office: slackInfo.profile.fields.Xf1LTXNG6P.value, // Office
                                    cert: certDetails.cert,
                                    level: level,
                                    track: track,
                                    cert_status: certDetails.certStatus,
                                    starts_timestamp: certDetails.starts.unix(),
                                    starts: certDetails.starts.format("MM/DD/YYYY"),
                                    expires_timestamp: certDetails.ends.unix(),
                                    expires: certDetails.ends.format("MM/DD/YYYY"),
                                }
                            }, function(err, data) {
                                if (err) {
                                    console.log("Error saving cert: " + err, null);
                                }
                                else {
                                    console.log("Cert info saved to DynamoDB");
                                    certObject.message = ":tada: Congrats, " + certDetails.fin + "! :tada:\nYour '" + certDetails.cert + "' cert is logged, safe and sound. Great work!";
                                }
                                callback(null, certObject);
                            });

                            console.log(JSON.stringify(certObject));
                        }
                        else {
                            certObject.found = false;
                            certObject.message = "Hmm, that's a valid '" + certDetails.cert + "' cert for " + certDetails.fin + ".\nBut there doesn't seem to be a Fin with email " + likelyEmail + ".\nIf you think this is a mistake, contact #aws-certbot-support";
                            console.log("Not a Fin: " + likelyEmail);
                            callback(null, certObject);

                        }

                    }
                });
            }
        });
        
    }

}

module.exports = {
    extractListingsFromHTML
};