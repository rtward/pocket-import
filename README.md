# pocket-import
A small script to upload a list of URLs into pocket

# Usage
Get a Pocket API consumer key from here: https://getpocket.com/developer/apps/

Fomat your list of articles into a CSV with a title column and url column.  See import-example.csv for an example file.

~~~~
npm install
node import.js --filename <your csv file> --consumer_key <your consumer key> --delay <seconds between requests, default 15>
~~~~
