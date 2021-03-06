/**
 * Module Dependencies
 */

var Emitter = require('emitter');
var loadScript = require('load-script');
var uid = require('uid');
var getId = require('youtube-id');
var getMeta = require('youtube-meta');


/**
 * Expose Youtube
 */

module.exports = YouTube;

/**
 * YouTube Constructor
 * 
 * @param {String} src     
 * @param {Object} options 
 */

function YouTube(src, target, options){
  if (!(this instanceof YouTube)) return new Youtube(src, target, options);
  this.options = options || {};
  this.src = src;

  var el = this.el = document.createElement('div');
  this.target = el.id = uid();
  target.appendChild(el);

  this.currentTime = 0;

  // load iframe api script if we haven't.
  if (typeof YT == 'undefined') {
    window.onYouTubeIframeAPIReady = this.build.bind(this);
    loadScript('//www.youtube.com/iframe_api');
  } else {
    this.build();
  }
}

Emitter(YouTube.prototype);

/**
 * Once the script is fetched, build our vid, fetch meta
 * 
 * @return {YouTube} 
 */

YouTube.prototype.build = function(){
  var id = getId(this.src);

  this.node = new YT.Player(this.target, {
    width: this.options.width,
    height: this.options.height,
    videoId: id,
    playerVars: this.options.playerVars
  });

  function onReady(){
    this.isReady = true;
    this.bindEvents();
    this.duration = this.node.getDuration();
    this.emit('ready');
  }

  this._boundReady = onReady.bind(this);
  this.node.addEventListener('onReady', this._boundReady);
  return this;
};

/**
 * Load metadata for the video
 * 
 * @param  {Function} fn 
 * @return {YouTube}  
 */

YouTube.prototype.meta = function(fn){
  getMeta(this.src, function(json){
    this.meta = json && json.data;
    this.emit('loadedmetadata', json.data);
    if (fn) fn(json.data);
  }.bind(this));
  return this;
};

/**
 * Bind events
 * 
 * @return {YouTube} 
 */

YouTube.prototype.bindEvents = function(){
  var node = this.node;

  function onchange(state){
    switch(state) {
      case 0:
        this.emit('ended');
        this.onErrorOrPause();
        break;
      case 1:
        this.emit('playing');
        this.onPlayback();
        break;
      case 2:
        this.emit('pause');
        break;
      case 3:
        this.emit('buffering');
        break;
      case 5:
        this.emit('cued');
        break;
      case 'error':
        this.emit('error');
        this.onErrorOrPause();
        break;
    }
  }

  this._boundonchange = onchange.bind(this);
  node.addEventListener('onStateChange', this._boundonchange);
  node.addEventListener('onError', onchange.bind(this, 'error'));

  return this;
};

/**
 * Clear our playback interval on pause/error
 */

YouTube.prototype.onErrorOrPause = function(){
  this.playing = false;
  if (this.interval) clearInterval(this.interval);
};

/**
 * emit current time
 */

YouTube.prototype.onTimeUpdate = function(){
  this.currentTime = this.node.getCurrentTime();
  this.emit('timeupdate', this.currentTime);
};

/**
 * pause video
 */

YouTube.prototype.pause = function(){
  this.node.pauseVideo(); 
  this.playing = false;
  return this;
};

/**
 * play video
 */

YouTube.prototype.play = function(){
  if (!this.isReady) {
    this.once('ready', this.play.bind(this));
    return;
  }
  this.node.playVideo();
  this.playing = true;
  return this;
};

/**
 * emulate timeupdate event for youtube to
 * match html api.
 */

YouTube.prototype.onPlayback = function(){
  this.playing = true;
  if (this.interval) clearInterval(this.interval);
  this.interval = setInterval(this.onTimeUpdate.bind(this), 250);
  return this;
};

/**
 * get youtube id from url string
 */

YouTube.prototype.getId = function(url){
  return getId(url);
};

/**
 * Remove our video from the dom
 * 
 * @return {YouTube} 
 */

YouTube.prototype.remove = function(){
  var el = document.getElementById(this.target);
  el.parentNode.removeChild(el);
  return this;
};