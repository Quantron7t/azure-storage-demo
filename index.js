const {
    BlobServiceClient,
    BlockBlobClient,
    AccountSASPermissions,
    StorageSharedKeyCredential,
    SASProtocol,
    generateBlobSASQueryParameters,
    AccountSASResourceTypes,
    AccountSASServices
} = require('@azure/storage-blob');
require("dotenv").config();


console.log('Blob SAS Tokens');
const moment = require('moment');

const constants = {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING
};

async function createAccountSas() {
    const sharedKeyCredential = new StorageSharedKeyCredential(
        constants.accountName,
        constants.accountKey
    );

    const sasOptions = {
        containerName: "documents",
        permissions: AccountSASPermissions.parse("rwdlac"),          // permissions
        protocol: SASProtocol.Https,
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + (10 * 60 * 1000)),   // 10 minutes
    };

    const sasToken = generateBlobSASQueryParameters(
        sasOptions,
        sharedKeyCredential
    ).toString();

    return (sasToken[0] === '?') ? sasToken : `?${sasToken}`;
}

function createSASUsingConnectionString() {
    let bService = BlobServiceClient.fromConnectionString(constants.connectionString);
    let sasURL = bService.generateAccountSasUrl(
        expiresOn = new Date(new Date().valueOf() + (60 * 60 * 1000)),
        permissions = AccountSASPermissions.parse("rwdlac")
    );
    let sasToken = sasURL.substring(sasURL.indexOf('?') + 1, sasURL.length);

    return sasToken;
}


//https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/containerclient?view=azure-node-latest
async function getAllFileUrls(containerName, folderName) {
    let blobServiceClient = BlobServiceClient.fromConnectionString(constants.connectionString);
    let containerClient = blobServiceClient.getContainerClient(containerName);
    let blobs = [];
    for await (const response of containerClient
        .listBlobsFlat({
            prefix: folderName + '/',
        })
        .byPage({ maxPageSize: 20 })) {
        for (const item of response.segment.blobItems) {
            let itemUrl = item.name;
            blobs.push(itemUrl);
        }
    }
    blobServiceClient
    return blobs;
}

//finds all finds under given "container/folder" path
async function getAllFileUrlsInContainer(containerName, folderName) {
    let blobs = await getAllFileUrls(containerName, folderName);
    let blobWithSasKey = [];
    blobs.forEach((item) => {
        const fileSasToken = createSASUsingConnectionString();
        console.log(getUrl(containerName, item, fileSasToken));
        blobWithSasKey.push(getUrl(containerName, item, fileSasToken));
    });

    return blobWithSasKey;
}

function getUrl(containerName, pathToFile, fileSasToken) {
    let baseURL = BlobServiceClient.fromConnectionString(constants.connectionString).url;
    let fullFileURL = `${baseURL}${containerName}/${pathToFile}?${fileSasToken}`;

    return fullFileURL;
}

function getBlobBaseURL() {
    return BlobServiceClient.fromConnectionString(constants.connectionString).url;
}

//https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload-javascript
async function createBlockBlobFromLocalFile(localPath, destinationContainer, destinationBlob) {

    // localPath => localpath can be absolute or relative -> to get relative path use this `${__dirname}/${localPath}`
    // destinationContainer => container in which the file needs to be copied into
    // destinationBlob => format <folderName>/<FileName>.<FileExtension> ex : FolderA/File.pdf

    const destinationContainerClient = BlobServiceClient
        .fromConnectionString(constants.connectionString)
        .getContainerClient(destinationContainer);

    // create block blob clients
    const destinationBlockBlobClient = await destinationContainerClient.getBlockBlobClient(destinationBlob);

    // upload file to blob storage    
    return await destinationBlockBlobClient.uploadFile(localPath);
}

async function startCopyBlob(sourceUrl, destinationContainer, destinationBlob) {
    // sourceUrl => if source is from blob should contain sastoken with url or create a new client and get its url
    // destinationContainer => container in which the file needs to be copied into
    // destinationBlob => format <folderName>/<FileName>.<FileExtension> ex : FolderA/File.pdf

    const destinationContainerClient = BlobServiceClient
        .fromConnectionString(constants.connectionString)
        .getContainerClient(destinationContainer);

    // create blob clients
    const destinationBlobClient = await destinationContainerClient.getBlobClient(destinationBlob);

    // start copy
    const copyPoller = await destinationBlobClient.beginCopyFromURL(sourceUrl);
    console.log('start copy from A to B');

    // wait until done
    return await copyPoller.pollUntilDone();
}

async function getSASTokenForContainer() {
    ///Create Access Key Credential
    let blobServiceClient = BlobServiceClient.fromConnectionString(constants.connectionString);
    let skc = blobServiceClient.credential;

    let startTime = moment()
        .add(-24, 'h')
        .toDate();
    let endTime = moment().add(1, 'h').toDate();
    ///Generate SAS Token
    let sas = generateBlobSASQueryParameters(
        {
            container : 'train',
            permissions: AccountSASPermissions.parse('rwdlac'),
            resourceTypes: AccountSASResourceTypes('sco'),
            services: AccountSASServices('b'),
            startsOn: startTime,
            expiresOn: endTime,
        },
        skc
    );
    return sas.toString();    
}

//console.log(createSASUsingConnectionString());
//console.log(getBlobBaseURL());

getAllFileUrlsInContainer("documents", "uploaded").then((r) => {
    console.log(JSON.stringify(r));
});

// getAllFileUrls("documents","uploaded").then((r)=>{
//     console.log(JSON.stringify(r));
// });

// createBlockBlobFromLocalFile(
//     "tempfolder/dummy-invoice.pdf",
//     "documents",
//     "tempfolder/dummy-invoice-demo2.pdf"
// ).then((r) => {
//     console.log(JSON.stringify(r));
// })
// .catch(err =>{    
//     console.log("Exception Handled")
//     console.log(err)
// });

// startCopyBlob(
//     "https://<yourstorage>.blob.core.windows.net/<containername>/<subfolder>/<filename>.<fileextn>?sv=2021-10-04&ss=b&srt=sco&se=2023-02-16T15%3A15%3A13Z&sp=rwdlac&sig=EKcoBhOTvmCRXh540uf5NCUJsRiobJe4ne8wPZ8LOtM%3D",
//     "documents",
//     "archive/zLO_InvoiceTest1_page1.pdf"
// ).then((r) => {
//     console.log(JSON.stringify(r));
// });

// getSASTokenForContainer().then((r) => {
//     console.log(r);
// });

// createAccountSas().then((r) => {
//     console.log(r);
// })

