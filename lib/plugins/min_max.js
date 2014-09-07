/*
  Add validation 
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
                                   return this.min_path;
                                 }
                              , 'error': new Error('min_path is required')
                              }
                            , {
                                'validator': function(){
                                   return this.max_path;
                                 }
                              , 'error': new Error('max_path is required')
                              }
                             ]
                          }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'min_path': false
  , 'max_path': false
  });

  schema.pre('validate', function(next){
    if (_.isUndefined(this.get(a.o.min_path)) || _.isUndefined(this.get(a.o.max_path))) return next();
    if (this.get(a.o.min_path) === this.get(a.o.max_path)) return next();
    if (this.get(a.o.min_path) > this.get(a.o.max_path)) return next(new Error(a.o.min_path + ' must be less than or equal to ' + a.o.max_path));

    return next();
  });

  return schema;
};
