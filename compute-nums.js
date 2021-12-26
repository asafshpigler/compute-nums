const axios = require('axios');
const fs = require('fs');
const path = require('path');
const {EOL} = require('os');

const SERVER_URL = 'http://35.189.216.103:9005'
const INPUT_FILE_PATH = path.join(__dirname, 'numbers.txt');
const OUTPUT_FILE_PATH = path.join(__dirname, 'output.txt');
const GET_RESULT_TIMEOUT = 8000

const numsToProcess = [];
const writeStream = fs.createWriteStream(OUTPUT_FILE_PATH);

const REQ_LIMIT = 5 //analyzeRequestLimit();
readNums();

function readNums() {
  console.log('readNums');

  const readStream = fs.createReadStream(INPUT_FILE_PATH);
  readStream.setEncoding('utf8');

  // accumulate numbers in memory
  readStream.on('data', function(chunk) {
    const numsChunk = chunk.split(EOL).map(s => +s);
    numsToProcess.push(...numsChunk);
  })

  // after initial chunk was read, start processing numbers
  readStream.once('data', function() {
    processNums();
  })
}

function processNums() {
  console.log('processNums');

  for (let i = 0; i < REQ_LIMIT; i++) {
    processNum();
  }
}

async function processNum() {
  if (numsToProcess.length === 0) {
    // console.log('completed processing numbers')
    return;
  }

  const num = numsToProcess.pop();
  const reqId = await postComputeNumber(num);

  console.log('processNum', num, reqId);
  
  setTimeout(async () => {
    let computedResult;

    // currently not handling failed gets, which should be retried 3 times
    try {
      computedResult = await getComputedResult(reqId);
      console.log('num processed successfuly', num, computedResult);
    }
    catch (err) {
      console.error(err);
      console.log('write a retry logic mate!');
    }

    // persist result
    writeStream.write(`${num}:${computedResult}${EOL}`);
    
    // advance to next number
    processNum();
  }, GET_RESULT_TIMEOUT)
}

async function postComputeNumber(num) {
  const res = await axios({
    url: SERVER_URL,
    method: 'post',
    data: { data: num }
  })

  return res.data.request_id;
}

async function getComputedResult(reqId) {
  const res = await axios({
    url: SERVER_URL,
    method: 'get',
    params: { request_id: reqId }
  })

  return res.data.result;
}