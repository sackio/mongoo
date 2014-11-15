/*
  Use it
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore');

module.exports = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'validators': {
    
                          }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {

  });

  //add val to set at path if no other elements return true for iter
  schema.method('iter_add', function(path, val, _iter){
    var iter = _.isFunction(_iter) ? _iter : function(e){ return _.isObject(_iter) ? e.match(_iter) : Belt.deepEqual(e, _iter); };

    if (_.some(this.get(path), iter.bind(this))) return false;
    return this.get(path).addToSet(val);
  });

  //return index of first matching element in set at path
  schema.method('iter_indexOf', function(path, _iter){
    var iter = _.isFunction(_iter) ? _iter : function(e){ return _.isObject(_iter) ? e.match(_iter) : Belt.deepEqual(e, _iter); };

    var ind = -1, cur = 0;
    while (ind === -1 && cur < this.get(path).length){
      if (iter.bind(this)(this.get(path + '.' + cur.toString()), cur)){
        ind = cur;
        break;
      }
      cur++;
    }
    return ind;
  });

  //remove any elements where iter returns true for set at path
  schema.method('iter_remove', function(path, _iter){
    var iter = _.isFunction(_iter) ? _iter : function(e){ return _.isObject(_iter) ? e.match(_iter) : Belt.deepEqual(e, _iter); };

    var ind = this.iter_indexOf(path, iter)
      , rm = [];
    while (ind !== -1){
      rm.push(this.get(path + '.' + ind));
      this.get(path).splice(ind, ind + 1);

      ind = this.iter_indexOf(path, iter.bind(this));
    }
    return rm;
  });

  //add a validator that throws an error if any element in the set at path returns true for iter
  schema.validate_set = function(path, _iter, options){
    var b = Belt.argulint(arguments, {'options': options || {}});
    b.o = _.defaults(b.o, {
      'hook': 'pre'
    , 'method': 'validate'
    , 'err_msg': path + ' has invalid elements'
    });

    var iter = _.isFunction(_iter) ? _iter : function(e){ return _.isObject(_iter) ? e.match(_iter) : Belt.deepEqual(e, _iter); };

    return this[b.o.hook](b.o.method, function(next){
      if (!this.isModified(path)) return next();

      if (this.iter_indexOf(path, iter.bind(this)) !== -1) return next(new Error(b.o.err_msg));
      return next();
    });
  };

  //add a validator that throws an error if duplicate values are returned for iter (iter can be a string to return a property or a function)
  schema.validate_set_dupes = function(path, iter, options){
    var b = Belt.argulint(arguments, {'options': options || {}});
    b.o = _.defaults(b.o, {
      'hook': 'pre'
    , 'method': 'validate'
    , 'err_msg': path + ' has duplicate elements'
    , 'sparse': false
    });

    var it = _.isFunction(iter) ? iter : function(el){
      var v = iter ? el.get(iter) : el;
      return b.o.sparse && (_.isNull(v) || _.isUndefined(v)) ? Belt.uuid() : v;
    };

    return this[b.o.hook](b.o.method, function(next){
      if (!this.isModified(path)) return next();

      if (_.any(this.get(path))
         && _.keys(_.groupBy(this.get(path), it.bind(this))).length !== this.get(path).length)
        return next(new Error(b.o.err_msg));

      return next();
    });
  };

  return schema;
};
