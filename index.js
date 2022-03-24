const ftp = require("basic-ftp");
const fs = require("fs");
var CronJob = require("cron").CronJob;
const winston = require("./config/winston");
const { promisify } = require("util");
const { join } = require("path");
const mv = promisify(fs.rename);
const lodash = require("lodash");

var lisofFiles = [];
var filepath = `${process.env.FTP_DIR}${process.env.FTP_PATH}`;
var reference = `${process.env.FTP_DIR}${process.env.FTP_REFERENCE_PATH}`;
const moveThem = async (filename) => {
    const original = join(filepath, filename);
    const target = join(reference, filename);
    await mv(original, target);
};

function readFiles() {
    fs.readdir(filepath, (err, files) => {
        if (err) console.log(err);
        else {
            lisofFiles = lodash.orderBy(files, ["asc"]);
            console.log("\nCurrent directory filenames:");
            files.forEach((file) => {
                console.log(file);
            });
        }
    });
}

async function executeProcess() {
    const client = new ftp.Client();

    client.ftp.verbose = true;
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USERNAME,
            password: process.env.FTP_PASSWORD,
        });

        for (let i = 0; i <= lisofFiles.length; i++) {
            if (lisofFiles.length == i) {
                client.close();

                winston.info(`Connection Closed -- ${new Date()}`);
            } else {
                await client.uploadFrom(
                    `${filepath}${lisofFiles[i]}`,
                    `${process.env.FTP_DIR}${lisofFiles[i]}`
                );

                winston.info(`${lisofFiles[i]} uploaded successfully -- ${new Date()}`);
                await moveThem(lisofFiles[i]);
            }

        }
    } catch (err) {
        winston.error(`${err} -- ${new Date()}`);
    }
    client.close();
    lisofFiles = [];
}


var job = new CronJob("* * * * *", function () {
    readFiles();
    executeProcess();
});
job.start();
