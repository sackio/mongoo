/*
  If any paths are defined, require that all are defined
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore');

module.exports = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'validators': {
                            'options': [
                              {
                                'validator': function(){
                                   return this.paths;
                                 }
                              , 'error': new Error('paths is required')
                              }
                            ]
                          }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'paths': []
  , 'if_paths': []
  });

  a.o.paths = Belt.toArray(a.o.paths);
  a.o.if_paths = Belt.toArray(a.o.if_paths);

  var stringified_paths = '[' + a.o.paths.join(', ') +']'
    , stringified_if_paths = '[' + a.o.if_paths.join(', ') + ']';

  schema.pre('validate', function(next){
    var self = this;

    if (!_.any(a.o.if_paths) && _.some(a.o.paths, function(p){ return !_.isNull(self.get(p)) && typeof self.get(p) !== 'undefined'; })
       && _.some(a.o.paths, function(p){ return _.isNull(self.get(p)) || typeof self.get(p) === 'undefined'; }))
      return next(new Error(stringified_paths + ' must all be defined'));

    if (_.any(a.o.if_paths) && _.every(a.o.if_paths, function(p){ return !_.isNull(self.get(p)) && typeof self.get(p) !== 'undefined'; })
       && _.some(a.o.paths, function(p){ return _.isNull(self.get(p)) || typeof self.get(p) === 'undefined'; }))
      return next(new Error(stringified_paths + ' must all be defined if ' + stringified_if_paths + ' are defined'));

    return next();
  });

  return schema;
};
