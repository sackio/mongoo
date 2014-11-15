/*
  Update paths and save, with validations and hooks
*/

'use strict';

var Belt = require('jsbelt')
  , Async = require('async')
  , _ = require('underscore');

module.exports = function(schema){

  schema.static('setSave', function(ids, paths, options, callback){
    var a = Belt.argulint(_.values(arguments).slice(2))
      , self = this;
    a.o = _.defaults(a.o, {
      'paths_array': _.isArray(ids)
    });
    var globals = {};
    globals.ids = Belt.toArray(ids);
    return Async.waterfall([
      function(cb){
        return self.find({'_id': {'$in': globals.ids}}, Belt.cs(cb, globals, 'docs', 1, 0));
      }
    , function(cb){
        if (!globals.docs) return cb();

        var i = 0;
        return Async.mapSeries(globals.docs, function(d, _cb){
          d.set(a.o.paths_array ? paths[i] : paths);
          i++;
          return d.save(_cb);
        }, Belt.cs(cb, globals, 'docs', 1, 0));
      }
    ], function(err){
      if (err) console.error(err);
      return a.cb(err, Belt.deArray(globals.docs || [undefined]));
    });
  });

  return schema;
};


