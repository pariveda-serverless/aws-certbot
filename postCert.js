const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const qs = require('querystring');
const req = require('request');
const certificationUrl = 'https://aw.certmetrics.com/amazon/public/verification.aspx';
const decryptedSlackAuthToken = process.env['SLACK_APP_AUTH_TOKEN'];
// See https://api.slack.com/docs/token-types#verification
const token = process.env['VERIFICATION_TOKEN'];
const TABLE = process.env['TABLE'];
const EPHEMERAL = "ephemeral";
const CHANNEL = "in_channel";
const {extractListingsFromHTML} = require('./helpers');
const curl = require('curlrequest');

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

    let slackValues = inputParams.text.split('%2C');

    let certid = (slackValues[0] !== null ? slackValues[0].toString() : "").trim();
    console.log('cert id is ' + certid);
    req.post("https://slack.com/api/users.profile.get", {
        auth: {
            bearer: decryptedSlackAuthToken
        },
        form: {
            token: decryptedSlackAuthToken,
            user: slackUserId,
            include_labels: false
        }
    }, function (error, response, body) {
        if (error) {
            callback("SLACK PROFILE RETRIEVAL ERROR - " + error, null);
        } else {
            // Nice and ugly info for the curl request, retrieved by running a real request in the browser
            let options = {
                url: certificationUrl,
                method: 'POST',
                compressed: true,
                headers: {
                    'origin': 'https://aw.certmetrics.com',
                    'accept-encoding': 'gzip, deflate, br',
                    'accept-language': 'en-US,en;q=0.9',
                    'cookie': '_ga=GA1.2.737381459.1519052278; _gid=GA1.2.729271125.1522270667; ASP.NET_SessionId=mupoxmmfwpebg4h5yzmis0jk',
                    'pragma': 'no-cache',
                    'upgrade-insecure-requests': '1',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
                    'content-type': 'application/x-www-form-urlencoded',
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'cache-control': 'no-cache',
                    'authority': 'aw.certmetrics.com',
                    'referer': 'https://aw.certmetrics.com/amazon/public/verification.aspx'
                },
                data: {
                    __EVENTTARGET: '',
                    __EVENTARGUMENT: '',
                    DES_Group: '',
                    __VIEWSTATE: 'GEBk/+fJ7AipPgdAICQWwRh7lJkkTGg8S9NEJ5skJ+EqEA1wMLwi5++L/+dJIyA8IxfcqGv77gwp6zIodEdymggeAXc+N2RHLTEIfKthbuOWZme8sx6YszdvqLywWf9qi3pHStzyyFt1X0kIzXXNnrznCYPutvd/wfSw8NoRgOV5WgxGdla4zJF/G09r8k+7LHDoDNW3BSN8ruJKIKgoIkbQregMX906duR4kh5w7QUlcxfe7eMe/uN21db+Utsj/rp5lzQoWmCDMIrx3xG9VbHTlaY0EJP61Eh4Y48fP09tCTkX0qajmYlsg9zR3MawBLoT9ydqEiT5it5Wi9sRlTzL3cO6bIKfVl38KlBseo4s+3s3vWKdUM3R7eeFdKBXgCaWDZtbC9ZjbRotSoBoS/KnyJP73ilEibhlVpM90oxwnqubDZqj79gaQchcWH24Ef0EVMAqDOKaatczUNyRtA2nZCPEBGrYH1Fa3BDqhxdeAX93izHQXpGpX7oTx7NhOzWgz8utg8o7sDaXm9iWif+OkiOV6aN3+kPCuV8rz+1FXcP46cZdI04NUQ4jBV5+9kBLYLAg9hwCHwc7AwZ/CGT+xA7+Vl/CE2kmUFMuUOxcV8QwmlcN5lbs+4Lxd1JwNvOFWIh79nJzZ2aHQWwuaKAcNKUb4O3/vk4A5l3pMMl+l4ysCoOIrttUWGxJBCqjWLvoXeW9i3CZzUfZFocUhwNilxChnrDoYrcyo2lA6yqmShuAKK56wj56Ikts0/XsYaxLHfzqtbUnS3pxKMOrEqkzn4tdBvGl+4/ES+CJrd2SJXOHGIcth8n5L48BAXQu+xkiLuim4WM+DyBr6ZtigATMTPtdKTrNKE2PT/HIQkbPPQCrpGzM6BtEDgyujT8bj2xuAOQwppidH57RmW2ZWat9sJM5/speRekh08EP932W++Vg0+FGs3wPqLVW1nbOSlP12QCPKLZbOK40JD3qfmHSE171QhzO/7+gijUDqnauKS2/oeoaYZBjgavnADT+4M61LSnAmmGJGd4aBJrEr1stA/F7hoSSwNq5Mp+edgNp2CyFvSUI6IJUHE5lDmCLZ20F0w8ZHqsktDcswxUy+Y8aJyZxs3wwETfAJ1qrga55V3w5/CeOvvC1XZj2SWvNv5qSmcnGJM2ztMiILigmbuTITQJtRvCOlZ0QukhidYqCaOzen8ku7nvmQAGoMStAuQeISf0dg0lUV9mIAQ3eMK6bzE4wa64KS68gdyp3xY/Unduo',
                    __VIEWSTATEGENERATOR: 'DDE86476',
                    __VIEWSTATEENCRYPTED: '',
                    __EVENTVALIDATION: 'kq0Xp1G59bjbKG3EV0s7mXxAP7zd777kEKA3q1QzzCqoNwyqc+7h/K1lotjERLnDshJECKQXicR1wrVoF0Vib0AyO83LWOCtfE4UFwBUyQ3bRzw4H4wNzxSsX05bwheSM3q0B9jsSgfFPHeRPQlc6fl071szcGpQoguUZmTKBrLhT7tRjPRttXOdGgx1/7OWEqlUMyPDKElYYrp39ejmUtfibfU=',
                    ctl00$mainContent$txtVerificationCode: certid,
                    ctl00$ctl02$cbxCulture: '/amazon/public/verification.aspx?language=en',
                    ctl00$mainContent$btnSubmit: 'Submit'
                },
                include: false
            };
            let badgeOptions = {
                url: certid,
                method: 'GET',
            };
            if (certid.toLowerCase().startsWith('https://')) {
                options = badgeOptions;
            }
            curl.request(options, function (err, parts) {
                extractListingsFromHTML(parts, certid, slackUserId, TABLE, decryptedSlackAuthToken, function (err, response) {
                    if (err) {
                        console.log("Horrible error: " + err);
                    } else {
                        // extraction successful
                        let responseType = CHANNEL;
                        if (response.found === false) {
                            responseType = EPHEMERAL;
                        }
                        let options = {
                            uri: responseUrl,
                            method: 'POST',
                            json: {
                                "response_type": responseType,
                                "text": response.message
                            }
                        };
                        console.log("Parse responds with: " + JSON.stringify(options));
                        req(options, function (error, response, body) {
                            if (!error && response.statusCode === 200) {
                                console.log("great success!") // Print the shortened url.
                            }
                            else {
                                console.log("Error responding to slack at: " + responseUrl);
                                console.log("Has the URL been used more than 5 times or is older than 30 minutes?");
                            }
                        });
                    }
                });

            });
        } // end else
    });
}

exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);
};