/*
  Utility methods for Mongoose and MongoDB
*/

var Belt = require('jsbelt')
  , Async = require('async')
  , _ = require('underscore')
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

    return S;
  };

  return module.exports = Utils; 

}).call(this);
