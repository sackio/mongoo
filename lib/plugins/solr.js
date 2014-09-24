/*
  Add Solr record for a Mongoose document on save
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , Async = require('async')
  , Solrdex = new require('solrdex')()
;

module.exports = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'validators': {
                            'options':
                              {
                                'validator': function(){
                                   return this.paths || this.path;
                                 }
                              , 'error': new Error('path(s) is required')
                              }
                         }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'solr_client': Solrdex
  , 'paths': a.o.path && !a.o.paths ? [a.o.path] : (a.o.paths || [])
  , 'model_field': 'model_s'
  , 'field_suffix': '_en'
  });

  schema.pre('save', function(next){
    var self = this
      , mod = _.chain(_.isArray(a.o.paths) ? a.o.paths : _.keys(a.o.paths))
               .reject(function(p){ return !self.isModified(p); })
               .value();
    if (!_.any(mod)) return next();

    var doc = _.object(_.map(mod, function(p){ return p + a.o.field_suffix; })
                      , _.map(mod, function(p){ return self.get(p); }));
    doc.id = self.get('_id');
    doc[a.o.model_field] = self.constructor.modelName;

    return a.o.solr_client.add(doc, Belt.cw(next, 0));
  });

  schema.post('remove', function(){
    var self = this;

    return a.o.solr_client.delete(self.get('_id'), Belt.noop);
  });

  schema.static('solrSearch', function(query, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
      'qf': a.o.fields || a.o.paths
    , 'fq': a.o.model_field + ':' + self.modelName
    });

    b.o.qf = _.isArray(b.o.qf) ? _.map(b.o.qf, function(f){ return f + a.o.field_suffix; })
                               : _.object(_.map(b.o.qf, function(v, k){ return k + a.o.field_suffix; })
                                         , _.values(b.o.qf));
    var globals = {};
    return Async.waterfall([
      function(cb){
        return a.o.solr_client.textSearch(query, b.o, Belt.cs(cb, globals, 'results', 1, 0));
      }
    , function(cb){
        if (!_.any(globals.results)) return cb();

        return self.find({'_id': {'$in': _.pluck(globals.results || [], 'id')}}, Belt.cs(cb, globals, 'results', 1, 0));
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err, globals.results || []);
    });
  });

  return schema;
};
