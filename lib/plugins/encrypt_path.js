/*
  Encrypt a given path on save. Exposes a virtual attribute for setting the attribute
  and a comparison method for plaintext.
*/

'use strict';

var Bcrypt = require('bcrypt')
  , Belt = require('jsbelt')
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
    'path': false //the attribute to define
  , 'virtual_path': 'plaintext_' + a.o.path
  , 'salt_work_factor': 10
  , 'min': 8
  , 'required': false
  , 'virtual_prefix': '__'
  , 'virtual_modified': '__isModified'
  , 'max': 4096
  , 'remove_virtual': true
  , 'regex': false
  });

  schema.add(_.object([a.o.path], [{'type': String}]));

  var vp = schema.virtual(a.o.virtual_path);
  vp.get(function(){
    return this[a.o.virtual_prefix + a.o.virtual_path];
  });
  vp.set(function(val){
    this[a.o.virtual_prefix + a.o.virtual_path] = val;
    return this[a.o.virtual_prefix + a.o.virtual_path + a.o.virtual_modified] = true;
  });

  if (a.o.min || a.o.max || a.o.regex){
    schema.pre('validate', function(next){
      if (!this[a.o.virtual_prefix + a.o.virtual_path + a.o.virtual_modified]) return next();

      if (a.o.min && (!this.get(a.o.virtual_path) || this.get(a.o.virtual_path).length < a.o.min))
        return next(new Error(a.o.virtual_path + ' is less than ' + a.o.min + ' characters'));

      if (a.o.max && (!this.get(a.o.virtual_path) || this.get(a.o.virtual_path).length > a.o.max))
        return next(new Error(a.o.virtual_path + ' is more than ' + a.o.max + ' characters'));

      if (a.o.regex && !Belt._call(this.get(a.o.virtual_path), 'match', a.o.regex))
        return next(new Error(a.o.virtual_path + ' does not match ' + Belt._call(a.o.regex, 'toString')));

      return next();
    });
  }

  schema.pre('save', function(next){
    var self = this;

    if (!self[a.o.virtual_prefix + a.o.virtual_path + a.o.virtual_modified]) return next();

    return Bcrypt.genSalt(a.o.salt_work_factor, function(err, salt){
      if (err) return next(err);

      return Bcrypt.hash(self.get(a.o.virtual_path), salt, function(err, hash){
        if (err) return next(err);

        self.set(a.o.path, hash);

        if (a.o.remove_virtual){
          self.set(a.o.virtual_path, null);
          self[a.o.virtual_prefix + a.o.virtual_path + a.o.virtual_modified] = false;
        }
        return next();
      });
    });
  });

  schema.pre('save', function(next){
    if (!a.o.required || this.get(a.o.path)) return next();
    return next(new Error('Path \'' + a.o.path + '\' is required'));
  });

  schema.methods['match_' + a.o.path] = function(value, callback){
    var b = Belt.argulint(arguments);
    return Bcrypt.compare(value, this.get(a.o.path), Belt.cw(b.cb, 1));
  };

  return schema;
};
