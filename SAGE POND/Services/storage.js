const fs = require("fs");
const path = require("path");

const dataDirectory = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDirectory, "auth-data.json");

function ensureDataFile() {
    if (!fs.existsSync(dataDirectory)) {
        fs.mkdirSync(dataDirectory, { recursive: true });
    }

    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(
            dataFile,
            JSON.stringify({
                users: [],
                verificationTokens: []
            }, null, 4),
            "utf8"
        );
    }
}

function readData() {
    ensureDataFile();

    const fileContent = fs.readFileSync(
        dataFile,
        "utf8"
    );

    return JSON.parse(fileContent);
}

function writeData(data) {
    ensureDataFile();

    fs.writeFileSync(
        dataFile,
        JSON.stringify(data, null, 4),
        "utf8"
    );
}

module.exports = {
    readData,
    writeData
};