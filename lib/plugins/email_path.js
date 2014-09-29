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
  , 'regex': Belt.email_regexp
  , 'array': false
  });

  if (!a.o.existing_path && !a.o.array_path){
    var def = [_.omit(a.o, ['path', 'array', 'array_path', 'existing_path', 'regex'])];
    if (a.o.array) def = [def];

    schema.add(_.object([a.o.path], def));
  }

  schema.pre('validate', function(next){
    if (a.o.array_path){
      if (!this.isModified(a.o.array_path)) return next();

      for (var i = 0; i < this.get(a.o.array_path).length; i++){
        if (this.get(a.o.array_path + '.' + i + '.' + a.o.path)
           && !this.get(a.o.array_path + '.' + i + '.' + a.o.path).match(a.o.regex))
          return next(new Error(a.o.array_path + '.' + i + '.' + a.o.path + ' is not a valid email'));
      }

      return next();
    }

    if (!this.isModified(a.o.path)) return next();

    if (this.get(a.o.path) && !this.get(a.o.path).match(a.o.regex))
      return next(new Error(a.o.path + ' is not a valid email'));

    return next();
  });

  return schema;
};
