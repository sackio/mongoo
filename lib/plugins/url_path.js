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
  , 'array': false
  , 'array_path': false
  , 'existing_path': false
  });

  if (!a.o.existing_path && !a.o.array_path){
    var def = [_.omit(a.o, ['path', 'array', 'array_path', 'existing_path'])];
    if (a.o.array) def = [def];

    schema.add(_.object([a.o.path], def));
  }

  schema.pre('validate', function(next){
    if (a.o.array_path){
      if (!this.isModified(a.o.array_path)) return next();

      for (var i = 0; i < this.get(a.o.array_path).length; i++){
        if (!Url.parse(this.get(a.o.array_path + '.' + i + '.' + a.o.path), null, true).host)
          return next(new Error(a.o.array_path + '.' + i + '.' + a.o.path + ' is not a valid url'));
      }

      return next();
    }

    if (!this.isModified(a.o.path)) return next();

    if (!Url.parse(this.get(a.o.path), null, true).host) return next(new Error(a.o.path + ' is not a valid url'));

    return next();
  });

  return schema;
};
