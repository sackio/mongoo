/*
  Update paths and save, with validations and hooks
*/

'use strict';

var Belt = require('jsbelt')
  , Async = require('async')
  , _ = require('underscore');

module.exports = function(schema){

  schema['static']('findOneOrCreate', function(query, attr, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
    
    });

    var gb = {};

    return Async.waterfall([
      function(cb){
        return self.findOne(query, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        if (gb.doc){
          gb.doc.set(a.o);
          return gb.doc.save(Belt.cs(cb, gb, 'doc', 1, 0));
        }

        return self.create(a.o, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    ], function(err){
      return a.cb(err, gb.doc);
    });
  });

  return schema;
};


