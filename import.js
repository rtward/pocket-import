const csvParse = require('csv-parse');
const fs       = require('fs');
const Promise  = require('bluebird');
const rp       = require('request-promise');
const yargs    = require('yargs');
const readline = require('readline');

const args = yargs.argv;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const filename = args.filename;
if (!filename) {
	console.error('you must provide a filename');
	process.exit(1);
}

const consumer_key = args.consumer_key;
if (!filename) {
	console.error('you must provide a consumer key');
	process.exit(1);
}

const delay = args.delay || 15;
if (!args.delay) {
	console.log('using default delay of 15 seconds');
}

async function getAccessToken() {
	console.log('---------------');
	console.log('acquiring access token...');

	const requestCodeResp = await rp({
		method: 'POST',
		uri:    'https://getpocket.com/v3/oauth/request.php',
		form:   { consumer_key, redirect_uri: 'https://google.com' },
	});

	const requestCode = requestCodeResp.replace(/^code=/, '');

	console.log(`got request code: ${requestCode}`);

	const baseAuthUrl = 'https://getpocket.com/auth/authorize';
	const requestQuery = `request_token=${requestCode}`;
	const redirectQuery = 'redirect_uri=https://google.com';
	const authUrl = `${baseAuthUrl}?${requestQuery}&${redirectQuery}`;

	console.log(`please open ${authUrl}`);

	await Promise.fromCallback(cb =>
		rl.question(`then return here and hit enter after you've authorized the app`, cb)
	);

	const accessTokenResp = await rp({
		method: 'POST',
		uri:    'https://getpocket.com/v3/oauth/authorize',
		form:   { consumer_key, code: requestCode },
	});

	const accessToken = accessTokenResp
		.replace(/^access_token=/, '')
		.replace(/&.*$/, '');

	console.log(`got access token: ${accessToken}`);

	console.log('---------------');

	return accessToken;
}

async function getArticles() {
	console.log('---------------');
	console.log('getting articles to load');

	const fileBuffer = await Promise.fromCallback((cb) => fs.readFile(filename, cb));
	const fileString = fileBuffer.toString('utf-8');

	console.log('read file into a string');

	const csvData =
		await Promise.fromCallback((cb) => csvParse(fileString, { columns: true }, cb));

	console.log(`parsed file into a list, found ${csvData.length} articles to load`);

	console.log('---------------');

	return csvData;
}

async function putArticle(access_token, index, length, {url, title}) {
	console.log('---------------');
	console.log(`saving article to pocket: ${title}`);
	console.log(`url: ${url}`);

	const time = Math.floor((new Date().getTime()) / 1000);
	const data = { url, time, consumer_key, access_token };
	
	await rp({
		method: 'POST',
		uri:    'https://getpocket.com/v3/add.php',
		json:   true,
		body:   data,
	})
	.then(() => console.log(`article ${index+1}/${length} done`))
	.delay(delay * 1000);

	console.log('---------------');
}

Promise.resolve()
.then(async () => {
	console.log('---------------');
	console.log('starting');
	console.log('---------------');

	const articles     = await getArticles();
	const access_token = await getAccessToken();

	await Promise.each(
		articles,
		(article, index, length) => putArticle(access_token, index, length, article)
	);

	console.log('---------------');
	console.log('finished');
	console.log('---------------');
	process.exit(0);
})
.catch(err => {
	console.error(JSON.stringify(err, null, 2));
	process.exit(1);
});
