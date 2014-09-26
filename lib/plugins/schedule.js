/*
  Add a Timely schedule representation to a path
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore');

module.exports = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'validators': {
                            'options': function(){
                              return this.path;
                            }
                          }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'path': false
  });

  return schema;
};
