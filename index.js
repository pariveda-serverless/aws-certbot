'use strict';

const AWS = require('aws-sdk');
var Lambda = require('lambda-log-wrapper');
var Timer = require('lambda-log-timer');

/* This is a sample Lambda Function for getting started with serverless
*
*/
module.exports.hello = (event, context, callback) => {
  Timer.getTimeService(main, event, context, callback);
};

function main(event, context, callback) {
  // The code snippet here shows how you can access a value stored in the encrypted S3
  // secrets bucket at runtime - see https://github.com/pariveda-serverless/support/tree/master/secrets-uploader
  // for detailed instructions on uploading secret data
  // const params = {
  //     Bucket: process.env.SECRETS_BUCKET,
  //     Key: 'secret-file.enc'
  // };
  // const s3 = new AWS.S3({signatureVersion: "v4"});
  // s3.getObject(params, function(err, data) {
  //     if (err) console.log(err, err.stack); // an error occurred
  //     else {
  //         const secretContents = data.Body.toString('ascii');
  //         // Don't log secrets, because they will be pushed to Elastic/Kibana
  //         // Instead, use them as you would any variable
  //         console.log(secretContents);
  //     }
  // });
  // end secret sample code
  
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless! Your function executed successfully!',
      input: event,
    }),
  };

  callback(null, response);
}
