/*
  Simple access control for Mongoose
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , Async = require('async')
  , Rol = require('rol')
  , Mongoose = require('mongoose')
;

module.exports = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'prefix': 'ac'
  , 'rol': new Rol()
  , 'instance_rules': false
  , 'model_rules': false
  , 'model_keys': ['$where', 'Model', 'increment', 'model', 'remove', 'save'
                  , 'aggregate', 'count', 'create', 'discriminator', 'distinct' 
                  , 'ensureIndexes', 'find' , 'findById', 'findByIdAndRemove'
                  , 'findByIdAndUpdate', 'findOne', 'findOneAndRemove', 'findOneAndUpdate'
                  , 'geoNear', 'geoSearch', 'mapReduce', 'populate', 'remove'
                  , 'update', 'where', 'base', 'collection', 'db', 'discriminators'
                  , 'modelName', 'schema']
  , 'instance_keys': ['equals', 'get', 'inspect', 'invalidate', 'isDirectModified'
                     , 'isInit', 'isModified', 'isSelected', 'markModified'
                     , 'modifiedPaths', 'populate', 'populated', 'set', 'toJSON'
                     , 'toObject', 'toString', 'update', 'validate', 'errors', 'id'
                     , 'isNew', 'schema']
  , 'templates': []
  , 'restrict_api': true
  });

  if (!a.o.instance_rules) a.o.instance_rules = a.o.rol;
  if (!a.o.model_rules) a.o.model_rules = a.o.rol;

  /*
    Provide references for all available keys
  */
  schema.method(a.o.prefix + 'Keys', function(){
    return a.o.instance_keys;
  });
  schema.static(a.o.prefix + 'Keys', function(){
    return a.o.model_keys;
  });

  //Templated, conservative access controls for Mongoose
  schema[a.o.prefix + 'Templates'] = function(acTest){
    return {
      //Restrict API - limit access to methods known for Mongoose
      'restrict_api': {
        'label': 'restrict_api'
      , 'selector': function(methName){
           return !_.some(a.o.model_keys.concat(a.o.instance_keys), function(r){
             return r === methName;
           });
         }
      , 'handler': acTest ? function(acObj, methObj, cb){
                              if (acTest.call(this, acObj, methObj)){
                                if (cb) return cb();
                                return;
                              }

                              if (cb) return cb(new Error('Access denied (restricted method)'));
                              return new Error('Access denied (restricted method)');
                            }
                          : function(acObj, methObj, cb){
                              if (cb) return cb(new Error('Access denied (restricted method)'));
                              return new Error('Access denied (restricted method)');
                            }
      }

      //Read only - allow read-only access to a model, no creations, updates, or deletes
    , 'read_only': {
        'label': 'read_only'
      , 'selector': /^Model$|^increment$|^remove$|^save$|^create$|^discrimator$|^ensureIndexes$|^findByIdAndRemove$|^findOneAndUpdate$|^update$|^base$|^collection$|^db$|^discriminators$|^schema$|^invalidate$|^markModified$|^set$|^update$|^validate$/
      , 'handler': acTest ? function(acObj, methObj, cb){
                              if (acTest.call(this, acObj, methObj)){
                                if (cb) return cb();
                                return;
                              }

                              if (cb) return cb(new Error('Access denied (read-only)'));
                              return new Error('Access denied (read-only)');
                            }
                          : function(acObj, methObj, cb){
                              if (cb) return cb(new Error('Access denied (read-only)'));
                              return new Error('Access denied (read-only)');
                            }
      }

      //Instance only -- only allow access to instance methods
    , 'instance_only': {
        'label': 'instance_only'
      , 'handler': acTest ? function(acObj, methObj, cb){
                              if (acTest.call(this, acObj, methObj)){
                                if (cb) return cb();
                                return;
                              }

                              if (this instanceof Mongoose.Document) return cb ? cb() : undefined;

                              if (cb) return cb(new Error('Access denied (instance only)'));
                              return new Error('Access denied (instance only)');
                            }
                          : function(acObj, methObj, cb){
                              if (this instanceof Mongoose.Document) return cb ? cb() : undefined;

                              if (cb) return cb(new Error('Access denied (instance only)'));
                              return new Error('Access denied (instance only)');
                            }
      }

      //Required Scoping

      //Restricted Fields

      //Whitelisted Fields
    };
  };

  if (a.o.restrict_api && !_.find(a.o.templates, function(t){ return t === 'restrict_api'; }))
    a.o.templates.unshift('restrict_api');

  if (_.any(a.o.templates)){
    var temps = schema[a.o.prefix + 'Templates']();
    if (!Belt.deepEqual(a.o.model_rules, a.o.instance_rules)){
      _.each(a.o.templates, function(t){
        a.o.instance_rules.addRule(temps[t]);
        return a.o.model_rules.addRule(temps[t]);
      });
    } else {
      _.each(a.o.templates, function(t){
        return a.o.model_rules.addRule(temps[t]);
      });
    }
  }

  //adding access control methods to instances and model

  schema.method(a.o.prefix, function(){
    return a.o.instance_rules.rol.apply(this, arguments);
  });

  schema.static(a.o.prefix, function(){
    return a.o.model_rules.rol.apply(this, arguments);
  });

  schema.method(a.o.prefix + 'Sync', function(){
    return a.o.instance_rules.rolSync.apply(this, arguments);
  });

  schema.static(a.o.prefix + 'Sync', function(){
    return a.o.model_rules.rolSync.apply(this, arguments);
  });

  schema.method(a.o.prefix + 'Async', function(){
    return a.o.instance_rules.rolAsync.apply(this, arguments);
  });

  schema.static(a.o.prefix + 'Async', function(){
    return a.o.model_rules.rolAsync.apply(this, arguments);
  });


  schema.method(a.o.prefix + 'AddRule', function(){
    return a.o.instance_rules.addRule.apply(this, arguments);
  });

  schema.static(a.o.prefix + 'AddRule', function(){
    return a.o.model_rules.addRule.apply(this, arguments);
  });

  schema.method(a.o.prefix + 'RemoveRule', function(){
    return a.o.instance_rules.removeRule.apply(this, arguments);
  });

  schema.static(a.o.prefix + 'RemoveRule', function(){
    return a.o.model_rules.removeRule.apply(this, arguments);
  });

  schema.method('mediator', function(options){
    var o = options || {'keys': a.o.instance_keys}
      , medObj = o.obj || {}
      , w = a.o.instance_rules.wrap(this);
    w.interface(medObj, w, o);
    return medObj;
  });

  schema.static('mediator', function(options){
    var o = options || {'keys': a.o.model_keys}
      , medObj = o.obj || {}
      , w = a.o.model_rules.wrap(this);
    w.interface(medObj, w, o);
    return medObj;
  });

  return schema;
};
