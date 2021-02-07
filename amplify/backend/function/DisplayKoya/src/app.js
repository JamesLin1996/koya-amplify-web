/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/

var https = require('https')
var express = require('express')
var bodyParser = require('body-parser')
var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

// declare a new express app
var app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
});

// KOYA database
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'});
const s3 = new AWS.S3({
  endpoint: 's3-us-west-2.amazonaws.com',
  accessKeyId: process.env.access,
  secretAccessKey: process.env.secret,
  Bucket: 'koya-web',
  signatureVersion: 'v4',
  region: 'us-west-2'
});

/**********************
 * Example get method *
 **********************/

app.get('/koya/:id', function(req, res) {
  console.log('GET Reached');
  const params = {
    TableName: 'koya',
    Key: {'submission_id': req.params.id}   // 5fe53eadd0893b23335205f4
  };

  ddb.get(params, function(err, data) {
    if (err) {
      console.log("Error", err);
      res.json({fail: 'GET KOYA fail, invalid KOYA id!', url: req.url, id: req.params.id});
    }
    else {
      if ('image' in data.Item) {
        const s3_key = data.Item.image.split('.amazonaws.com/koya-web/')[1];
        data.Item['image'] = getSignedUrl(s3_key);
      }
      else if ('video' in data.Item) {
        const s3_key = data.Item.video.split('.amazonaws.com/koya-web/')[1];
        data.Item['video'] = getSignedUrl(s3_key);
      }

      if (!data.Item['receipt_emailed']) {
        sendEmail(req.params.id);
      }

      console.log("Success", data.Item);
      res.json({success: 'GET KOYA success!', data: data.Item});
    }
  });
});

function getSignedUrl(key) {
  key = key.replace(/%20/g, ' ');
  const params = {
    Bucket: 'koya-web',
    Key: key,
    Expires: 60 * 60
  };
  try {
    return s3.getSignedUrl('getObject', params);
  } catch (err) {
    if (err) {
      console.log(err);
    }
  }
}

function sendEmail(submission_id) {
  console.log('entered SendEmail');
  https.get(`https://ydkty6umdd.execute-api.us-west-2.amazonaws.com/default/SendEmail?submission_id=${submission_id}`, (resp) => {
    // A chunk of data has been received.
    resp.on('data', (chunk) => {
      console.log('SendEmail Response: ' + chunk)
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}

app.get('/koya/:id/*', function(req, res) {
  // Add your code here
  res.json({success: 'get call succeed!', url: req.url});
});

/****************************
* Example post method *
****************************/

app.post('/koya/:id', function(req, res) {
  // Add your code here
  res.json({success: 'post call succeed!', url: req.url, body: req.body})
});

app.post('/koya/:id/*', function(req, res) {
  // Add your code here
  res.json({success: 'post call succeed!', url: req.url, body: req.body})
});

/****************************
* Example put method *
****************************/

app.put('/koya/:id', function(req, res) {
  // Add your code here
  res.json({success: 'put call succeed!', url: req.url, body: req.body})
});

app.put('/koya/:id/*', function(req, res) {
  // Add your code here
  res.json({success: 'put call succeed!', url: req.url, body: req.body})
});

/****************************
* Example delete method *
****************************/

app.delete('/koya/:id', function(req, res) {
  // Add your code here
  res.json({success: 'delete call succeed!', url: req.url});
});

app.delete('/koya/:id/*', function(req, res) {
  // Add your code here
  res.json({success: 'delete call succeed!', url: req.url});
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
