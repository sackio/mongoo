/*
  Add a path that must match an email format
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
                                   return this.path;
                                 }
                              , 'error': new Error('path is required')
                              }
                             ]
                          }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'path': false
  , 'type': String
  , 'match': Belt.email_regexp
  , 'array': false
  });

  var def = [_.omit(a.o, ['path', 'array'])];
  if (a.o.array) def = [def];

  schema.add(_.object([a.o.path], def));

  return schema;
};
