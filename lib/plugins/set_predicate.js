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
  schema.method('iter_add', function(path, val, iter){
    if (_.some(this.get(path), iter.bind(val))) return false;
    return this.get(path).addToSet(val);
  });

  //return index of first matching element in set at path
  schema.method('iter_indexOf', function(path, iter){
    var ind = -1, cur = 0;
    while (ind === -1 && cur < this.get(path).length){
      if (iter(this.get(path + '.' + cur.toString()), cur)){
        ind = cur;
        break;
      }
      cur++;
    }
    return ind;
  });

  //remove any elements where iter returns true for set at path
  schema.method('iter_remove', function(path, iter){
    var ind = this.iter_indexOf(path, iter)
      , rm = [];
    while (ind !== -1){
      rm.push(this.get(path + '.' + ind));
      this.get(path).splice(ind, ind + 1);

      ind = this.iter_indexOf(path, iter);
    }
    return rm;
  });

  //add a validator that throws an error if any element in the set at path returns true for iter
  schema.validate_set = function(path, iter, options){
    var b = Belt.argulint(arguments, {'options': options || {}});
    b.o = _.defaults(b.o, {
      'hook': 'pre'
    , 'method': 'validate'
    , 'err_msg': path + ' has invalid elements'
    });

    return this[b.o.hook](b.o.method, function(next){
      if (!this.isModified(path)) return next();

      if (this.iter_indexOf(path, iter) !== -1) return next(new Error(b.o.err_msg));
      return next();
    });
  };

  return schema;
};
