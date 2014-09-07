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
  });

  var stringified_paths = a.o.paths.join(', ');

  schema.pre('validate', function(next){
    var self = this;

    if (_.some(a.o.paths, function(p){ return self.get(p); })
       && _.some(a.o.paths, function(p){ return typeof self.get(p) === 'undefined'; }))
      return next(new Error(stringified_paths + ' must all be defined'));

    return next();
  });

  return schema;
};
