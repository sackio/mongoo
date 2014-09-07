/*
  Add timestamps to a schema, updating on save
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore');

module.exports = function(schema, options){
  var o = options || {};

  o = _.defaults(o, {
    'created_path': 'created_at'
  , 'updated_path': 'updated_at'
  });

  schema.add(_.object([o.created_path], [{'type': Date}]));
  schema.add(_.object([o.updated_path], [{'type': Date}]));

  schema.pre('save', function(next){
    var time = new Date();
    if (this.isNew) this.set(o.created_path, time);
    if (this.isModified()) this.set(o.updated_path, time);
    return next();
  });

  return schema;
};
