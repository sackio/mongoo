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
  , 'model_name': false
  , 'id_path': '_id'
  , 'search_only': false
  , 'search_method': 'solrSearch'
  , 'subdoc_path': false
  });

  if (!a.o.search_only) schema.pre('save', function(next){
    var self = this
      , mod = _.chain(_.isArray(a.o.paths) ? a.o.paths : _.keys(a.o.paths))
               .reject(function(p){ return !self.isModified(p); })
               .value();
    if (!_.any(mod)) return next();

    var doc = _.object(_.map(mod, function(p){ return p + a.o.field_suffix; })
                      , _.map(mod, function(p){ return self.get(p); }));

    doc.id = self.get('_id');
    doc[a.o.model_field] = a.o.model_name ? a.o.model_name : self.constructor.modelName;

    return a.o.solr_client.add(doc, Belt.cw(next, 0));
  });

  if (!a.o.search_only) schema.post('remove', function(){
    var self = this;
    return a.o.solr_client.delete(self.get('_id'), Belt.noop);
  });

  //exposing solr client to model
  schema.static('_solr', a.o.solr_client);

  schema.static(a.o.search_method, function(query, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
      'qf': a.o.fields || a.o.paths
    , 'fq': a.o.model_field + ':' + (b.o.model_name || a.o.model_name || self.modelName)
    , 'id_path': a.o.id_path || '_id'
    , 'subdoc_path': a.o.subdoc_path || false
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

        globals.results = _.pluck(globals.results || [], 'id');

        var obj = _.object([b.o.id_path], [{'$in': globals.results}]);
        return self.find(obj, Belt.cs(cb, globals, 'docs', 1, 0));
      }
    , function(cb){
        if (!_.any(globals.docs) || !b.o.subdoc_path) return cb();

        globals.results = _.object(globals.results, globals.results);

        globals.subdocs = {};
        _.each(globals.docs, function(d){
          var sp = d.get(b.o.subdoc_path)
            , di = d.get('_id');
          _.each(sp, function(s, i){
            var id = d.get(b.o.subdoc_path + '.' + i + '.' + '_id');
            if (!globals.results[id]) return;
            delete globals.results[id];
            globals.subdocs[di] = globals.subdocs[di] || [];
            return globals.subdocs[di].push(id);
          });
        });

        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err, globals.docs || [], globals.subdocs);
    });
  });

  return schema;
};
