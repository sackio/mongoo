/*
  Utility methods for Mongoose and MongoDB
*/

var Belt = require('jsbelt')
  , Async = require('async')
  , _ = require('underscore')
  , Util = require('util')
  , Solrdex = require('solrdex')
  , Mongodb = require('mongodb').MongoClient
  ;

(function(){

  var Utils = function(O){
    var S = {};
    S.settings = Belt.extend({}, O);

    /*
      Clear out any documents for all models in Mongoose
    */
    S['clearModels'] = function(mongoose, callback){
      var a = Belt.argulint(arguments, {'no_clone_options': true});

      return Async.eachSeries(mongoose.modelNames(), function(m, cb){
        return mongoose.model(m).remove({}, Belt.cw(cb));
      }, Belt.cw(a.cb));
    };

    S['clearSolr'] = function(options, callback){
      var a = Belt.argulint(arguments)
        , self = this;
      a.o = _.defaults(a.o, {
        'commit': true
      });
      var solr = new Solrdex(a.o);
      return solr.delete('*', Belt.cw(a.cb, 0));
    };

    S['dropDB'] = function(db, options, callback){
      var a = Belt.argulint(arguments)
        , self = this;
      a.o = _.defaults(a.o, {
        'host': '127.0.0.1'
      , 'port': '27017'
      });
      var globals = {};
      return Async.waterfall([
        function(cb){
          return Mongodb.connect(Util.format('mongodb://%s:%s/%s'
                 , a.o.host
                 , a.o.port
                 , db
                 ), Belt.cs(cb, globals, 'db', 1, 0));
        }
      , function(cb){
          return globals.db.dropDatabase(Belt.cw(cb, 0));
        }
      ], a.cb);
    };

    return S;
  };

  return module.exports = Utils; 

}).call(this);
