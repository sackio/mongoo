/*
  Add a path that represents a file
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , FS = require('fs')
  , Async = require('async')
  , FSTK = require('fstk');

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
  , 'schema': {
      'file_path': {type: String}
    , 'stat': Object
    }
  , 'array': false
  , 'auto_stat': true //stat path pre save
  , 'auto_remove': true //remove path when doc is removed
  , 'auto_touch': true //create path on save if it does not exist
  , 'auto_update': true //update file timestamps post save
  , 'auto_watch': false //watch path using FSTK pre init
  , 'exists_required': false //invalidate if path does not exist
  , 'virtual_prefix': '__'
  });

  var def = [a.o.schema];
  if (a.o.array) def = [def];

  schema.add(_.object([a.o.path], def));

  var vp = schema.virtual(a.o.path + '_prev_path');
  vp.get(function(){
    return this[a.o.virtual_prefix + a.o.path + '_prev_path'];
  });
  vp.set(function(val){
    return this[a.o.virtual_prefix + a.o.path + '_prev_path'] = val;
  });

  //stat the file at path
  schema.method('stat_file', function(path, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    return FSTK.stat(self.get(path + '.file_path'), function(err, stat){
      if (err) return b.cb(err);
      self.set(path + '.stat', stat);
      return b.cb(err, stat);
    });
  });

  //watch the file at path
  schema.method('watch_file', function(path, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;

    self.unwatch_file(path);

    return FSTK.watchFile(self.get(path + '.file_path'), _.pick(a.o, ['deserializer', 'serializer', 'auto_stat']), function(err, wf){
      if (err) return b.cb(err);
      self.get(path)[a.o.virtual_prefix + 'watcher'] = wf;

      if (a.o.auto_stat){
        self.set(path + '.stat', wf.stat);

        wf.emitter.on('read', function(){
          return self.set(path + '.stat', wf.stat);
        });
  
        wf.emitter.on('write', function(){
          return self.set(path + '.stat', wf.stat);
        });
      }

      return b.cb(err, wf);
    });
  });

  //unwatch the file at path
  schema.method('unwatch_file', function(path){
    var self = this;

    if (!Belt._get(self.get(path), a.o.virtual_prefix + 'watcher')) return false;

    Belt._call(self.get(path)[a.o.virtual_prefix + 'watcher.watcher'], 'close');
    self.get(path)[a.o.virtual_prefix + 'watcher'] = null;

    return true;
  });

  //remove the file at path
  schema.method('rm_file', function(path, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    return FSTK.rm(self.get(path + '.file_path'), function(err){
      return b.cb(err);
    });
  });

  //create the file at path
  schema.method('create_file', function(path, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;

    b.o = _.defaults(b.o, {
      'data': ''
    });

    return FSTK.writeFile(self.get(path + '.file_path'), b.o.data, function(err){
      return b.cb(err);
    });
  });

  //update file timestamps
  schema.method('update_ftimes', function(path, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;

    b.o = _.defaults(b.o, {
      'atime': new Date()
    , 'mtime': self.get('updated_at') || new Date()
    });

    return FS.utimes(self.get(path + '.file_path'), b.o.atime, b.o.mtime, function(err){
      return b.cb(err);
    });
  });

  //set file
  schema.method('set_file', function(path, file_path, options, callback){
    var b = Belt.argulint(arguments)
      , self = this
      , globals = {};

    b.o = _.defaults(b.o, {
      'prev_path': false
    , 'data': false
    });

    return Async.waterfall([
      function(cb){
        self.unwatch_file(path);
        self.set(path + '.file_path', file_path);
        return cb();
      }
    , function(cb){
        if (!b.o.prev_path) return cb();
        return FSTK.mv(b.o.prev_path, file_path, Belt.cw(cb, 0));
      }
    , function(cb){
        if (!b.o.data) return cb();
        return self.create_file(path, b.o, Belt.cw(cb, 0));
      }
    , function(cb){
        if (!a.o.auto_touch) return cb();
        return FSTK.exists(file_path, Belt.cs(cb, globals, 'exists', 0));
      }
    , function(cb){
        if (!a.o.auto_touch || globals.exists) return cb();
        return self.create_file(path, Belt.cw(cb, 0));
      }
    , function(cb){
        if (!a.o.auto_watch) return cb();
        return self.watch_file(path, Belt.cw(cb, 0));
      }
    ], function(err){
      return b.cb(err);
    });
  });

  //MIDDLEWARE

  schema.pre('save', function(next){
    if (!this.get(a.o.path + '_prev_path')) return next();

    var p = this.get(a.o.path + '_prev_path');
    this.set(a.o.path + '_prev_path', undefined);
    return FSTK.mv(p, this.get(a.o.path + '.file_path'), Belt.cw(next, 0));
  });

  //stat files pre-init
  if (a.o.auto_stat && !a.o.auto_watch) schema.post('init', function(){
    if (!this.get(a.o.path)) return;

    var b = Belt.argulint(arguments)
      , self = this;

    if (a.o.array){
      var index = 0;
      return Async.eachSeries(self.get(a.o.path), function(p, cb){
        index++;
        if (!self.get(a.o.path + '.' + (index -1) + '.file_path')) return cb();

        return self.stat_file(a.o.path + '.' + (index - 1), Belt.cw(cb, 0));
      }, Belt.noop);
    }

    if (!self.get(a.o.path + '.file_path')) return;

    return self.stat_file(a.o.path, Belt.noop);
  });

  //create files if it does not exist pre-save
  if (a.o.auto_touch) schema.pre('save', function(next){
    if (!this.get(a.o.path)) return next();

    var b = Belt.argulint(arguments)
      , self = this;

    if (a.o.array){
      var index = 0;
      return Async.eachSeries(self.get(a.o.path), function(p, cb){
        index++;
        if (!self.get(a.o.path + '.' + (index -1) + '.file_path')) return cb();

        return FSTK.exists(self.get(a.o.path + '.' + (index - 1) + '.file_path')
        , function(exists){
          if (exists) return cb();

          return FSTK.writeFile(self.get(a.o.path + '.' + (index - 1) + '.file_path')
          , '', Belt.cw(cb, 0)); 
        });
      }, Belt.cw(next, 0));
    }

    if (!self.get(a.o.path + '.file_path')) return next();

    return FSTK.exists(self.get(a.o.path + '.file_path'), function(exists){
      if (exists) return next();

      return FSTK.writeFile(self.get(a.o.path + '.file_path'), '', Belt.cw(next, 0)); 
    });
  });

  //stat files pre-save
  if (a.o.auto_stat) schema.pre('save', function(next){
    var b = Belt.argulint(arguments)
      , self = this;

    if (a.o.array){
      var index = 0;
      return Async.eachSeries(self.get(a.o.path), function(p, cb){
        index++;
        if (!self.get(a.o.path + '.' + (index -1) + '.file_path')) return cb();

        return self.stat_file(a.o.path + '.' + (index - 1), Belt.cw(cb, 0));
      }, Belt.cw(next, 0));
    }

    if (!self.get(a.o.path + '.file_path')) return next();

    return self.stat_file(a.o.path, Belt.cw(next, 0));
  });

  //setup file watching pre-init
  if (a.o.auto_watch) schema.post('init', function(){
    var b = Belt.argulint(arguments)
      , self = this;

    if (a.o.array){
      var index = 0;
      return Async.eachSeries(self.get(a.o.path), function(p, cb){
        index++;
        if (!self.get(a.o.path + '.' + (index -1) + '.file_path')) return cb();

        return self.watch_file(a.o.path + '.' + (index - 1), Belt.cw(cb, 0));
      }, Belt.noop);
    }

    if (!self.get(a.o.path + '.file_path')) return;

    return self.watch_file(a.o.path, Belt.noop);
  });

  //stop watching file on removal
  schema.pre('remove', function(next){
    var self = this;

    if (!self.get(a.o.path)) return next();

    if (a.o.array)
      _.each(this.get(a.o.path), function(p, i){
        return self.unwatch_file(a.o.path + '.' + i);
      });

    this.unwatch_file(a.o.path);

    return next();
  });

  //remove file post-remove
  if (a.o.auto_remove) schema.post('remove', function(){
    var b = Belt.argulint(arguments)
      , self = this;

    if (a.o.array){
      var index = 0;
      return Async.eachSeries(self.get(a.o.path), function(p, cb){
        index++;
        if (!self.get(a.o.path + '.' + (index -1) + '.file_path')) return cb();

        return self.rm_file(a.o.path + '.' + (index - 1), Belt.cw(cb));
      }, Belt.noop);
    }

    if (!self.get(a.o.path + '.file_path')) return;

    return self.rm_file(a.o.path, Belt.noop);
  });

  //update file timestamps pre-save
  if (a.o.auto_update) schema.pre('save', function(next){
    if (!this.isModified(a.o.path)) return next();

    var b = Belt.argulint(arguments)
      , self = this;

    if (a.o.array){
      var index = 0;
      return Async.eachSeries(self.get(a.o.path), function(p, cb){
        index++;
        if (!self.get(a.o.path + '.' + (index -1) + '.file_path')) return cb();
        if (!self.isModified(a.o.path + '.' + (index -1))) return cb();

        return self.update_ftimes(a.o.path + '.' + (index - 1), Belt.cw(cb));
      }, Belt.cw(next, 0));
    }

    if (!self.get(a.o.path + '.file_path')) return next();
    if (!self.isModified(a.o.path)) return next();

    return self.update_ftimes(a.o.path, Belt.cw(next, 0));
  });

  //require that file exists
  if (a.o.exists_required) schema.pre('validate', function(next){
    if (!this.get(a.o.path)) return next();

    var b = Belt.argulint(arguments)
      , self = this;

    if (a.o.array){
      var index = 0;
      return Async.eachSeries(self.get(a.o.path), function(p, cb){
        index++;
        if (!self.get(a.o.path + '.' + (index -1))) return cb();

        return FSTK.exists(self.get(a.o.path + '.' + (index - 1) + '.file_path')
        , function(exists){
          return cb(exists ? null
                           : new Error(self.get(a.o.path + '.' + (index - 1) + '.file_path') + ' does not exist')); 
        });
      }, Belt.cw(next, 0));
    }

    if (!self.get(a.o.path + '.file_path')) return next();

    return FSTK.exists(self.get(a.o.path + '.file_path'), function(exists){ 
      return next(exists ? null
             : new Error(self.get(a.o.path + '.file_path') + ' does not exist')); 
    });
  });

  return schema;
};
