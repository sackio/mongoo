/*
  Simple access control for Mongoose
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , Async = require('async');

module.exports = function(schema, options){
  var a = Belt.argulint(arguments);

  a.o = _.defaults(a.o, {
    'prefix': 'ac'
  , 'method_rules': []
  , 'static_rules': []
  });

  return schema;
};
