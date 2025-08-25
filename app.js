/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var xhub = require('express-x-hub');

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));

app.use(xhub({ algorithm: 'sha1', secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var token = process.env.TOKEN || 'token';
var received_updates = [];
var unified_updates = [];
var updates_by_app_id = {};

const registerUpdate = (body) => {
  if (body.object === 'application') {
    unified_updates.unshift(body);
    unified_updates = unified_updates.slice(0, 10);
  } else {
    received_updates.unshift(body);
    received_updates = received_updates.slice(0, 10);
  }
};

const registerUpdateByAppId = (body) => {
  if (body.object === 'application') {
    const appId = body.entry[0].id;

    if(appId) {
      if (appId in updates_by_app_id) {
        updates_by_app_id[appId].unshift(body);
        updates_by_app_id[appId] = updates_by_app_id[appId].slice(0, 5);
      } else {
        updates_by_app_id[appId] = [body];
      }
    }
  }
};

app.get('/', function(req, res) {
  console.log(req);
  res.send('<pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');
});

app.get('/sampleapp', function(req, res) {
  console.log(req);
  res.send(received_updates.slice(0, 5));
});

app.get('/sampleappunified', function(req, res) {
  console.log(req);
  res.send(unified_updates.slice(0, 5));
});

app.get('/unified/:appId', function(req, res) {
  const userId = req.params.userId;

  if (userId in updates_by_app_id) {
    res.send(updates_by_app_id[userId].slice(0, 5));
  } else {
    res.send([]);
  }
});

app.get('/sampleappall', function(req, res) {
  console.log(req);
  res.send(received_updates);
});

app.get(['/facebook', '/instagram', '/threads'], function(req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == token
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.post('/clear', function(req, res) {
  unified_updates = [];
  res.sendStatus(200);
});

app.post('/facebook', function(req, res) {
  // console.log('Facebook request body:', req.body);

  if (!req.isXHubValid()) {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    res.sendStatus(401);
    return;
  }

  console.log('request header X-Hub-Signature validated');
  // Process the Facebook updates here
  registerUpdate(req.body);
  res.sendStatus(200);
});

app.post('/instagram', function(req, res) {
  // console.log('Instagram request body:');
  // console.log(req.body);
  // Process the Instagram updates here
  registerUpdate(req.body);
  res.sendStatus(200);
});

app.post('/threads', function(req, res) {
  // console.log('Threads request body:');
  // console.log(req.body);
  // Process the Threads updates here
  registerUpdate(req.body);
  res.sendStatus(200);
});

app.listen();
