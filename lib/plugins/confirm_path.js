/*
  Add a virtual confirmation attribute
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
    'path': false //the path to confirm
  , 'confirm_path': a.o.path + '_confirmation'
  , 'virtual_prefix': '__'
  , 'virtual_modified': '__isModified'
  });

  var vp = schema.virtual(a.o.confirm_path);
  vp.get(function(){
    return this[a.o.virtual_prefix + a.o.confirm_path];
  });
  vp.set(function(val){
    this[a.o.virtual_prefix + a.o.confirm_path] = val;
    return this[a.o.virtual_prefix + a.o.confirm_path + a.o.virtual_modified] = true;
  });

  schema.pre('validate', function(next){
    if (!this.isNew && !this.isModified(a.o.path) && !Belt.call(this, 'schema.virtualpath', a.o.path))
       /*(!this.isModified(a.o.path)
         && !Belt._get(this, a.o.virtual_prefix + a.o.path + a.o.virtual_modified)
         && !Belt._get(this, a.o.virtual_prefix + a.o.confirm_path + a.o.virtual_modified)
       ))*/
       return next();

    if (this.get(a.o.path) !== this.get(a.o.confirm_path)
      && !(Belt.isNull(this.get(a.o.path)) && Belt.isNull(this.get(a.o.confirm_path))))
      return next(new Error(a.o.path + ' does not match ' + a.o.confirm_path));

    this.set(a.o.confirm_path, undefined);
    return next();
  });

  return schema;
};
