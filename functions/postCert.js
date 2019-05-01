const AWS = require('aws-sdk');
const docs = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const qs = require('querystring');
const req = require('request');
const certificationUrl = 'https://aw.certmetrics.com/amazon/public/verification.aspx';
const GET_SLACK_PROFILE_SERVICE_URL = process.env['GET_SLACK_PROFILE_SERVICE_URL'];
const OFFICE_SLACK_CUSTOM_FIELD_ID = process.env['OFFICE_SLACK_CUSTOM_FIELD_ID'];
const COHORT_SLACK_CUSTOM_FIELD_ID = process.env['COHORT_SLACK_CUSTOM_FIELD_ID'];
// See https://api.slack.com/docs/token-types#verification
const token = process.env['VERIFICATION_TOKEN'];
const TABLE = process.env['TABLE'];
const MAPPING_TABLE = process.env['MAPPING_TABLE'];
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

    let slackValues = inputParams.text.split(',');

    let certid = (slackValues[0] !== null ? slackValues[0].toString() : "").trim();
    console.log('cert id is ' + certid);
    // Nice and ugly info for the curl request, retrieved by running a real request in the browser
    let options = {
        url: certificationUrl,
        method: 'POST',
        compressed: true,
        headers: {
            'cookie': '_ga=GA1.2.24170448.1556137095; ASP.NET_SessionId=eglv3elmeuf0jb2owzheh54x; _gid=GA1.2.835676646.1556310023; _gat=1',
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'referer': 'https://aw.certmetrics.com/amazon/public/verification.aspx',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded',
            'upgrade-insecure-requests': '1',
            'origin': 'https://aw.certmetrics.com',
            'cache-control': 'no-cache,no-cache',
            'pragma': 'no-cache',
            'authority': 'aw.certmetrics.com'
        },
        data: {
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            DES_Group: '',
            __VIEWSTATE: 'gcJi4wDFXc1oXZqGM+pdDdevb/BqctEUl9kDy652eGrxCYeEquGixZaUwGhLLlotHRu7pAN3Nl2N0ofsWwMxcKxjQJP5iaA01Z/YNZmxjBYY/gsBXOXZaNMITSgeJsaV8rIam1EOhv5FEnRuzfj2YwWHyxN+SD6WeWCzdw6hvx5y3VjJbA9NDkBW1jbj8DW6aIukYTKICBEk19HDcAOA2nmTvgDN9r9U2xm4EQS8j+jyVEwS7LFLdfmli5S0Dzbnc8qJGkBaoaA+DRmYuZmRWpgFKf4b1YsVWbGHL1qAJd27IBADBVKwu4/tHNswz5hGTemvHKh/DN93X6w7TWVb9tu9PycVCy6YJlDF4wNnLN9mGiN0PtiepGprF6oSKwkkhW4TMfldWa2eWwi9P0lh4RFH7f/m68gw6oJ1zRgmrkPk7tTF50X+njW32HrBx7dcUtWU+M22MythDhq/LW5Aa3onIKrxdlJN67WWCGzoM+7QUzLbDn/nCeVT8I1ipDcAONPHJsSK3wSkJTOWPX0CSfj6rgvg+wp5tA5L1lGtL2E8gLquU8JcGBupLlCNr5/mnLPlAYhV/4QhQ1yQTLrxPXVblK/9T0sEoNZ86XEuzmS0D75ruSdZbUszgubsDwHktBzk0erZhGB3rdl8PxrncN4firZDzeITi9Y4ZRIMzZcYjo6tWQfoxs5lhYG8RsQ4X7Db3GC+THYr3JU599gtHewn0NIgHq2FJ/RWMjmEFkQNhOnjdw2ipWfdZwNfr/bIpQzQjkOfSzurcF9+Q0zyFu0Bk2z0E6LC4PaTsPzj4z/Jh//CjGmi8S3T2sfgLuScEhmJfCi2BZxbiwu0Y84nyqyCTFm/8Ozz99shm85TpeYRI6M93y8NvyQqLJ3YZzvsMgbW5/aDXBHFqIwD9HzjQny7hAeV/9RSRYTQrUbUa77cjK4CQdvV2Kqcywztmtp8D2aHS7GPs0Whkyv74g9gZmgcOucgAF6NTl3mJmCpGeJlgrZY',
            DES_JSE: '1',
            __VIEWSTATEGENERATOR: 'DDE86476',
            __VIEWSTATEENCRYPTED: '',
            __EVENTVALIDATION: 'uZzqoV6E/pCtXhcnxVrfOSE7nsmFxscUehKDZP6IdcYtGkitVklP1kdnfgIFoMpKLRkOPrdAuL/kx7/13E9WrIPNZ6CJQAovGTEV8p9dB832+V/fzW7K9JI5gGLZxZnOX/XlPA==',
            ctl00$ctl02$cbxCulture: '?language=en',
            ctl00$mainContent$txtVerificationCode: certid,
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
        extractListingsFromHTML(parts, certid, slackUserId, TABLE, MAPPING_TABLE, GET_SLACK_PROFILE_SERVICE_URL, OFFICE_SLACK_CUSTOM_FIELD_ID, COHORT_SLACK_CUSTOM_FIELD_ID, function (err, response) {
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
}

exports.handler = (event, context, callback) => {
    processEvent(event, context, callback);
};