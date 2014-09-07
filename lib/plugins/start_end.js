/*
  Add validation to ensure start_path is before end_path
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , Moment = require('moment');

module.exports = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'validators': {
                            'options': [
                              {
                                'validator': function(){
                                   return this.start_path;
                                 }
                              , 'error': new Error('start_path is required')
                              }
                            , {
                                'validator': function(){
                                   return this.end_path;
                                 }
                              , 'error': new Error('end_path is required')
                              }
                             ]
                          }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'start_path': false
  , 'end_path': false
  });

  schema.pre('validate', function(next){
    if (_.isUndefined(this.get(a.o.start_path)) || _.isUndefined(this.get(a.o.end_path))) return next();
    if (this.get(a.o.start_path) === this.get(a.o.end_path)) return next();

    var start = new Moment(this.get(a.o.start_path))
      , end = new Moment(this.get(a.o.end_path));

    if (!start.isBefore(end)) return next(new Error(a.o.start_path + ' must be before ' + a.o.end_path));
    if (!end.isAfter(start)) return next(new Error(a.o.start_path + ' must be after ' + a.o.end_path));

    return next();
  });

  return schema;
};
