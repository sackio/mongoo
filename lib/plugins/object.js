/*
  Handle documents like plain Javascript objects
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , FS = require('fs')
  , Async = require('async');

module.exports = function(schema, options){
  var a = Belt.argulint(arguments, {'options': options || {}});

  a.o = _.defaults(a.o, {

  });

  /*
    toObject -- with stringification of _id
  */
  schema.method('pObj', function(options){
    var obj = this.toObject(options);
    if (obj._id && obj._id.toString) obj._id = obj._id.toString();
    return obj;
  });

  /*
    return true if document matches another object
  */
  schema.method('match', function(mObj, options){
    var obj = this.pObj(options);
    return Belt.objMatch(obj, mObj);
  });

  return schema;
};
