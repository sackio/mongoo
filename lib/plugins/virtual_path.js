/*
  Add a virtual confirmation attribute
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore');

module.exports = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'virtual_prefix': '__'
  , 'virtual_modified': '__isModified'
  });

  schema[a.o.virtual_prefix + 'virtual'] = schema.virtual;

  schema.virtual = function(path){
    var vp = schema[a.o.virtual_prefix + 'virtual'](path);
    vp.get(function(){
      return this[a.o.virtual_prefix + path];
    });
    vp.set(function(val){
      this[a.o.virtual_prefix + path] = val;
      return this[a.o.virtual_prefix + path + a.o.virtual_modified] = true;
    });
    return vp;
  };

  schema.method('isModified', function(path){
    if (schema.virtualpath(path))
      return this[a.o.virtual_prefix + path + a.o.virtual_modified];

    return this.prototype.isModified(path);
  });

  return schema;
};
