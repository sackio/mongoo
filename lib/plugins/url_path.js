/*
  Add a path that must match a url format
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , Url = require('url');

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
  });

  schema.add(_.object([a.o.path], [_.omit(a.o, ['path'])]));

  schema.pre('validate', function(next){
    if (!this.isModified(a.o.path)) return next();

    if (!Url.parse(this.get(a.o.path), null, true).host) return next(new Error(a.o.path + ' is not a valid url'));

    return next();
  });

  return schema;
};
