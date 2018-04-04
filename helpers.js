const cheerio = require('cheerio');
const moment = require('moment');

function extractListingsFromHTML (html) {
    const $ = cheerio.load(html);
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
    let expires = moment(year+'-'+monthNumber+'-'+day, 'YYYY-MM-DD');
    console.log(expires);
    //let active = moment(expiration);
    //console.log(active);
    // const vacancies = [];
    // vacancyRows.each((i, el) => {
    //
    //     // Extract information from each row of the jobs table
    //     let name = $(el).children('.views-field-field-vacancy-deadline').first().text().trim();
    //     // let job = $(el).children('.views-field-title').first().text().trim();
    //     // let location = $(el).children('.views-field-name').text().trim();
    //     // closing = closing.slice(0, closing.indexOf('-') - 1);
    //     // closing = moment(closing, 'DD/MM/YYYY').toISOString();
    //     vacancies.push({name});
    // });
    let certObject = {
        name: name,
        cert:awsCert,
        status: certStatus,
        expires: expiration
    }
    console.log(JSON.stringify(certObject));
    return certObject;
}

function formatJobs (list) {
    return list.reduce((acc, job) => {
        return `${acc}${job.job} in ${job.location} closing on ${moment(job.closing).format('LL')}\n\n`;
    }, 'We found:\n\n');
}

module.exports = {
    extractListingsFromHTML,
    formatJobs
};