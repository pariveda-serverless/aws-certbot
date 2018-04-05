const cheerio = require('cheerio');
const moment = require('moment');

function extractListingsFromHTML (html) {
    const $ = cheerio.load(html);
    let found = false;
    let notFound = $('.pmError').text();
    console.log('length is' + notFound.length);
    if (notFound.length > 0) {
        let response = {
            found: found,
            message: notFound
        };
        console.log(response);
        return response;
    }
    else {
        found = true;
        console.log("not found is " + notFound);
        let name = $('#contentText fieldset h1').text();
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
        console.log(starts);
        var ends = starts.clone().add(2, 'year').subtract(1, 'day');
        console.log(ends);

        let certObject = {
            name: name,
            cert: awsCert,
            status: certStatus,
            starts: starts,
            expires: ends,
            found: found
        }
        console.log(JSON.stringify(certObject));
        return certObject;
    }
}

module.exports = {
    extractListingsFromHTML
};