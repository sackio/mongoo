/*
  Add a token for setting a path
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , Mongoose = require('mongoose')
  , Moment = require('moment');

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
  , 'token_path': a.o.path + '_token'
  , 'confirm_token_path': a.o.path + '_token_confirmation'
  , 'virtual_prefix': '__'
  , 'virtual_modified': '__isModified'
  , 'expires': false
  , 'required': true
  , 'auto_expire': true
  , 'auto_create': true
  , 'skip_on_new': true
  , 'single_use': true
  , 'min': 64
  , 'max': 256
  });

  //create an expiring token child schema and path
  var cs = {'token': String};
  if (a.o.expires) cs['expires_at'] = Date;
  schema.add(_.object([a.o.token_path], [cs]));

  //virtual attribute used to confirm token is valid
  var vp = schema.virtual(a.o.confirm_token_path);
  vp.get(function(){
    return this[a.o.virtual_prefix + a.o.confirm_token_path];
  });
  vp.set(function(val){
    this[a.o.virtual_prefix + a.o.confirm_token_path] = val;
    return this[a.o.virtual_prefix + a.o.confirm_token_path + a.o.virtual_modified] = true;
  });

  //method for creating a token
  schema.method('create_' + a.o.path + '_token', function(){
    this.set(a.o.token_path + '.token', Belt.random_string(Belt.random_int(a.o.min, a.o.max + 1)));
    if (a.o.expires) this.set(a.o.token_path + '.expires_at', new Moment().add(a.o.expires, 'ms').toDate());

    return this;
  });

  //if set to auto create, create token (if it does not exist) before saving (and checking)
  if (a.o.auto_create){
    schema.pre('save', function(next){
      if (!this.get(a.o.token_path + '.token')) this['create_' + a.o.path + '_token']();

      return next();
    });
  }

  schema.pre('save', function(next){
    if ((a.o.skip_on_new && this.isNew) || (!this.isNew && !this.isModified(a.o.path))) return next();

    var expires = this.get(a.o.token_path + '.expires_at');

    if (expires && new Moment(expires).isBefore(new Date()))
      return next(new Error('Token for ' + a.o.path + ' has expired'));

    if (a.o.required && !this.get(a.o.token_path + '.token'))
      return next(new Error('Token is required for ' + a.o.path));

    if (this.get(a.o.token_path + '.token') !== this.get(a.o.confirm_token_path))
      return next(new Error('Token for ' + a.o.path + ' does not match'));

    if (a.o.single_use){
      this.set(a.o.token_path, null);
      if (a.o.auto_create) this['create_' + a.o.path + '_token']();
    }

    return next();
  });

  //if set to auto expire, expire stale tokens before saving (and checking)
  if (a.o.auto_expire){
    schema.pre('save', function(next){
      var expires = this.get(a.o.token_path + '.expires_at');
      if (expires && new Moment(expires).isBefore(new Date()))
        this.set(a.o.token_path, null);

      return next();
    });
  }

  return schema;
};
