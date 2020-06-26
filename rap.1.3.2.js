/* vue-rap v1.3.2 | (c) 2018 by tengzhinei */
(function webpackUniversalModuleDefinition(root, factory) {
    if (typeof exports === 'object' && typeof module === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else if (typeof exports === 'object')
        exports["Rap"] = factory();
    else
        root["Rap"] = factory();
})(this, function () {
    function P(call) {
        function create() {
            var success = null;
            var success_arg = null;
            var result = 0;
            var error = null;
            var error_arg = null;
            var next = null;
            var nextCall = function () {
                try {
                    var data = success(success_arg);
                    if (data && typeof data.then == "function") {
                        //返回结果是 promise//需要等待
                        data.then(function (res) {
                            next.resolve(res);
                        }).catch(function (e) {
                            next.reject(e);
                        });
                    } else {
                        next.resolve(data);
                    }
                } catch (e) {
                    next.reject(e);
                }
            };

            return {
                resolve: function (res) {
                    if (result == 2 || result == 1) {
                        return this;
                    }
                    success_arg = res;
                    result = 1;
                    if (success) {
                        nextCall();
                    }
                    return this;
                },
                reject: function (res) {
                    if (result == 2 || result == 1) {
                        return this;
                    }
                    error_arg = res;
                    result = 2;
                    var reject_ok = false;
                    if (error) {
                        reject_ok = error(error_arg);
                    }
                    if (!reject_ok && next) {
                        next.reject(res);
                    }
                    return this;
                },
                then: function (call) {
                    next = P();
                    success = call;
                    if (result == 1) {
                        nextCall();
                    } else if (result == 2) {
                        if (error) {
                            error(error_arg);
                        } else {
                            next.reject(error_arg);
                        }
                    }
                    next.parent = this;
                    return next;
                },
                catch: function (e) {
                    next = P();
                    this.then(function () {
                        next.resolve();
                    });
                    error = e;
                    if (result == 2) {
                        error(error_arg);
                    }
                    next.parent = this;
                    return next;
                }
            };
        }

        var p = create();


        if (call) {
            p = p.resolve().then(call);
        }
        return p;
    }

    function rapGet(url) {
        var p = P();
        var request;
        if (window.XMLHttpRequest) {
            request = new XMLHttpRequest();//W3C
        } else {
            request = new ActiveXObject('MicroSoft.XMLHTTP');//IE
        }
        request.open('get', url);
        request.onreadystatechange = function () {
            if (request.readyState == 4 && request.status == 200) {
                p.resolve(request.responseText);
            }
            if (request.readyState == 4 && request.status == 404) {
                p.reject(request.status + ' : ' + request.statusText);
            }
        };
        request.send();
        return p;
    }


    var viewLines = {};
    var routers = {};
    var RapConfig = {script: [], css: []};

    var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
    var IndexedDBCache = {
        open: function () {
            var p = P();
            if (this.db) {
                p.resolve();
                return;
            }
            var me = this;
            var request = indexedDB.open('rap-cache', 10);
            request.onerror = function (e) {
                p.reject();
            };
            request.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('rap_cache')) {
                    db.createObjectStore('rap_cache', {keyPath: "key"});
                }
            };
            request.onsuccess = function (e) {
                me.db = e.target.result;
                p.resolve();
            };
            return p;
        }, set: function (key, content) {
            var transaction = this.db.transaction(['rap_cache'], 'readwrite');
            var store = transaction.objectStore('rap_cache');
            store.put({
                key: key,
                content: content
            });

        }, get: function (key) {
            var p = P();
            var transaction = this.db.transaction(['rap_cache'], 'readwrite');
            var store = transaction.objectStore('rap_cache');
            var request = store.get(key);
            request.onsuccess = function (e) {
                var item = e.target.result;
                if (item) {
                    p.resolve(item.content);
                } else {
                    p.resolve('');
                }
            };
            return p;
        }, remove: function (key) {
            var transaction = this.db.transaction(['rap_cache'], 'readwrite');
            var store = transaction.objectStore('rap_cache');
            store.delete(key);
        }, clear: function () {
            var transaction = this.db.transaction(['rap_cache'], 'readwrite');
            var store = transaction.objectStore('rap_cache');
            store.clear();
            localStorageCache.clear();
        }, each: function (call) {
            var p = P();
            var transaction = this.db.transaction(['rap_cache'], 'readwrite');
            var store = transaction.objectStore('rap_cache');
            var request = store.getAllKeys();
            request.onsuccess = function (e) {
                var item = e.target.result;
                var i = -1;

                function next() {
                    i++;
                    if (i == item.length) {
                        p.resolve();
                        return;
                    }
                    var key = item[i];
                    IndexedDBCache.get(key).then(function (content) {
                        var m = call(key, content);
                        if (m && m.then) {
                            m.then(function () {
                                next();
                            })
                        } else {
                            next();
                        }

                    })
                }

                next();

            };
            return p;
        }, pack: function () {
            var me = this;
            var p = P();
            var transaction = this.db.transaction(['rap_cache'], 'readwrite');
            var store = transaction.objectStore('rap_cache');
            var request = store.getAllKeys();
            request.onsuccess = function (e) {
                var keys = e.target.result;
                var i = -1;
                var js = '';

                function next() {
                    i++;
                    if (i == keys.length) {
                        js = "(function () {" + js + "})();";
                        p.resolve(js);
                        return;
                    }
                    var key = keys[i];
                    if (key.indexOf('.rap') == key.length - 4) {
                        me.get(key).then(function (content) {
                            var json = JSON.parse(content);
                            var script = json.script;
                            delete json['script'];
                            var name = key.substr(0, key.length - 4).split('/').join('_');
                            js += "var url='" + json.base + "';var modName='" + name + "';var config=" + JSON.stringify(json) + ";(function(url,name,config){\n Rap.$IS_CREATE_COMP=true; " + script + ";Rap.$IS_CREATE_COMP=false;\nRap.$create(url,name,config);\n})(url,modName,config);\n";
                            next();
                        });
                    } else {
                        next();
                    }
                }

                next();
            };
            return p;

        }
    };

    var localStorageCache = {
        get: function (key) {
            return P(function () {
                key = 'rap|' + key;
                return localStorage.getItem(key);
            });
        },
        set: function (key, value) {
            return P(function () {
                key = 'rap|' + key;
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    //内容已满删除非必要缓存
                    var length = localStorage.length;
                    var js = "";
                    for (var i = 0; i < length; i++) {
                        var k = localStorage.key(i);
                        if (key.indexOf('.rap') == key.length - 4 || key.indexOf('.ver') == key.length - 4) {
                            localStorage.removeItem(k);
                        } else if (key.indexOf('.js') > -1 && RapConfig.script.indexOf(k) < 0) {
                            localStorage.removeItem(k);
                        } else if (key.indexOf('.css') > -1 && RapConfig.css.indexOf(k) < 0) {
                            localStorage.removeItem(k);
                        }
                    }
                    localStorage.setItem(key, value);
                }
            });

        }, remove: function (key) {
            return P(function () {
                key = 'rap|' + key;
                localStorage.removeItem(key);
            });
        }, clear: function () {
            return P(function () {
                var length = localStorage.length;
                for (var i = 0; i < length; i++) {
                    var k = localStorage.key(i);
                    if (k.indexOf('rap|') == 0) {
                        localStorage.removeItem(k);
                    }
                }
            });
        }, count: function () {
            return localStorage.length;
        }, key: function (index) {
            return localStorage.key(index);
        }, pack: function () {
            var length = localStorage.length;
            var js = "";
            for (var i = 0; i < length; i++) {
                var key = localStorage.key(i);
                if (key.indexOf('.rap') == key.length - 4) {
                    var content = localStorage.get(key);
                    var json = JSON.parse(content);
                    var script = json.script;
                    delete json['script'];
                    var name = key.substr(0, key.length - 4).split('/').join('_');
                    js += "var url='" + json.base + "';var modName='" + name + "';var config=" + JSON.stringify(json) + ";(function(url,name,config){\n" + script + ";\nRap.$create(url,name,config);\n})(url,modName,config);\n";
                }
            }
            js = "(function () {" + js + "})();";
            return P(function () {
                return js;
            });
        }
    };

    var Cache = {
        instance: indexedDB ? IndexedDBCache : localStorageCache,
        getKey: function (key) {
            if (Rap.router_model == 'history') {
                return Rap.history_base + '|' + key;
            }
            return location.pathname + '|' + key;
        },
        open: function () {
            if (this.instance.open) {
                return this.instance.open();
            }
            return P().resolve();
        }, set: function (key, value) {
            key = this.getKey(key);
            return this.instance.set(key, value);
        }, get: function (key) {
            key = this.getKey(key);
            return this.instance.get(key);
        }, remove: function (key) {
            key = this.getKey(key);
            return this.instance.remove(key);
        }, clear: function () {
            return this.instance.clear();
        }, pack: function () {
            return this.instance.pack();
        }
    };


    function urlJoin(base, url) {
        if (url.indexOf('/') == 0) {
            return url;
        }

        var p = base.split("/");
        p.pop();
        if (url.indexOf('.') == -1) {
            return p.join('/') + '/' + url;
        }
        p.pop();
        p.pop();
        var pre = [];
        while (url.indexOf('../') == 0) {
            url = url.replace("../", "");
            pre.push(p.pop())
        }
        return pre.join("/") + "/" + url;
    }

    function loadLayoutAndRely(url, rely, layout) {
        var p = Rap.loadMod(layout);
        if (rely) {
            var exps = [];
            for (var i = 0; i < rely.length; i++) {
                (function () {
                    var r = rely[i];
                    if (r.indexOf('.js') > 0) {
                        var link = '/' + Rap.history_base + '/' + urlJoin(url, rely[i]);
                        var load = rapGet(link).then(function (data) {
                            eval('(function(){var module={exports:{}};exports=module.exports;' + data + '  })()');
                            if (typeof exports === 'object') {
                                if (Object.keys(exports).length == 0) {
                                    return;
                                }
                            }
                            exps.push(exports)
                        });
                        p = p.then(function () {
                            return load;
                        });
                    } else {
                        var load = Rap.loadMod(urlJoin(url, r));
                        p = p.then(function () {
                            return load;
                        });
                    }
                })();
            }
        }
        return p.then(function () {
            return exps;
        });
    }

    var require_data = {};
    var require_loading = {};
    var require_loading_P = {};

    var require_init = {};

    function loadRequire(url, rely, config, layout) {
        if (!Rap.isReady) {
            require_init[url] = {rely: rely, config: config, layout: layout};
            return;
        }
        require_loading[url] = true;
        var p = Rap.loadMod(layout);
        for (var i = 0; i < rely.length; i++) {
            (function () {
                var r = rely[i];
                if (r.indexOf('.js') > 0) {
                    var get_url = urlJoin(url, rely[i]);
                    if (require_data[get_url]) {
                        return 1;
                    } else if (require_loading[get_url] || require_init[get_url]) {
                        if (!require_loading_P[get_url]) {
                            require_loading_P[get_url] = [];
                        }
                        var wait = P();
                        require_loading_P[get_url].push(wait);
                        p = wait;
                    } else {
                        require_loading[get_url] = true;
                        var link = get_url;
                        if (Rap.router_model == 'history') {
                            link = '/' + Rap.history_base + link;
                        }
                        var load = Cache.get(link).then(function (content) {
                            var call = function (data) {
                                var define = eval(data);
                                if (define && define.then) {
                                    return define.then(function (exports) {
                                        require_data[get_url] = exports;
                                        require_loading[get_url] = false;
                                        var loading = require_loading_P[get_url];
                                        if (loading) {
                                            for (var i = 0; i < loading.length; i++) {
                                                var wait = loading[i];
                                                wait.resolve();
                                            }
                                        }
                                    });
                                }
                            };
                            if (!Rap.debug && content) {
                                return call(content);
                            } else {
                                return rapGet(link).then(function (content) {
                                    Cache.set(link, content);
                                    return call(content);
                                });

                            }
                        });
                        p = p.then(function () {
                            return load;
                        });
                    }
                } else {
                    var load = Rap.loadMod(urlJoin(url, r));
                    p = p.then(function () {
                        return load;
                    });
                }
            })();
        }
        return p.then(function () {
            var exps = [];
            for (var i = 0; i < rely.length; i++) {
                var r = urlJoin(url, rely[i]);
                if (r.indexOf('.js') > -0) {
                    exps.push(require_data[r]);
                }
            }
            if (typeof config === 'function') {
                config = config.apply(null, exps);
            }

            if (config) {
                require_data[url] = config;
            }
            require_loading[url] = false;
            var loading = require_loading_P[url];
            if (loading) {
                for (var i = 0; i < loading.length; i++) {
                    var wait = loading[i];
                    wait.resolve();
                }
            }
            return config;
        });
    }


    var head = document.getElementsByTagName("head")[0];

    function evalScript(modUrl, url, modName, config) {
        var p = P();
        var script = config.script;
        script = "(function(url,name,config,p){\n if(Rap.debug){console.log('模块加载: '+modName);} var $this=null;Rap.$IS_CREATE_COMP=true; " + script + ";Rap.$IS_CREATE_COMP=false;\nRap.$create(url,name,config,function(that){$this=that;}).then(function(){p.resolve();});\n})(modUrl,modName,config,p)\n";
        if (Rap.debug) {
            script += "//@ sourceURL=" + modUrl + ".js";
        }
        try {
            eval(script);
        } catch (e) {
            throw e;
        }
        return p;
    }

    function evalJS(url, script) {
        if (Rap.debug) {
            script += "//@ sourceURL=" + url;
        }
        eval(script);
    }

    function addCss(id, content) {
        var el = document.getElementById(id);
        if (!content || !content.trim())return;
        if (el) {
            var num = parseInt(el.getAttribute('num')) + 1;
            el.setAttribute('num', num + '');
            return;
        }
        var style = document.createElement('style');
        style.type = 'text/css';
        style.id = id;
        style.setAttribute('num', '1');
        style.innerHTML = content;
        head.appendChild(style);
    }


    var layoutAndRely = [];

    var compVersion = {};


    var scripts_loaded = [];


    function v_link_click(event) {
        var el = event.currentTarget;
        var link = el.getAttribute("rap-link");
        if (!link) {
            console.log(el);
        }
        var replace = el.getAttribute("rap-replace");
        var keep = el.getAttribute("rap-keep");
        var back = el.getAttribute("rap-back");
        if (back == 'true') {
            Rap.back();
            return;
        }
        var arg = el.getAttribute("rap-arg");
        Rap.go(link, replace == 'true', keep == 'true');
    }

    var RapReady = null;

    var InsertScript = {
        loaded: {},
        loading: {},
        insert: function (src) {
            var p = P();
            if (this.loaded[src]) {
                p.resolve();
                return p;
            }
            if (this.loading[src]) {
                this.loading[src].push(p);
                return p;
            }
            this.loading[src] = [];
            this.loading[src].push(p);
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = src;
            var me = this;
            script.onload = script.onreadystatechange = function () {
                if (script.readyState && script.readyState != 'loaded' && script.readyState != 'complete') return;
                script.onreadystatechange = script.onload = null;
                me.loaded[src] = true;
                var loading = me.loading[src];
                var length = loading.length;
                for (var i = 0; i < length; i++) {
                    var p = loading[i];
                    p.resolve();
                }
                me.loading[src] = [];
            };
            document.getElementsByTagName("head")[0].appendChild(script);
            return p;
        }
    };

    var onPageLoadError = function () {

    };
    var SCROLL_Y = 0;
    var IS_GO = false;
    var default_keep_include = [];
    var rap_ready = false;

    var weixin_refresh_time = '';
    var weixin_refresh_back = false;


    var Rap = {
        $IS_CREATE_COMP: false,
        is_weixin: false,
        is_android: false,
        router_model: 'hash',
        history_base: 'admin',
        history_base_index: 0,
        routerUrl: function () {
            if (Rap.router_model == 'hash') {
                return window.location.hash;
            } else {
                return location.pathname.substring(Rap.history_base_index) + location.search;
            }
        },
        config: function (config) {

            //缓存方案配置
            if (config.cache) {
                if (config.cache == 'localStorage') {
                    Cache.instance = localStorageCache;
                } else if (config.cache == 'indexedDB') {
                    if (indexedDB) {
                        Cache.instance = indexedDB;
                    }
                } else {
                    Cache.instance = config.cache;
                }
            }
            //路由方案配置
            if (config.router_model) {
                Rap.router_model = config.router_model;
            }
            if (config.history_base) {
                Rap.history_base = config.history_base;
            }
            if (Rap.router_model == 'history') {
                Rap.history_base_index = Rap.history_base.length + 1;
            }


            //keep_alive 方案配置
            if (config.keep_include) {
                for (var i = 0; i < config.keep_include.length; i++) {
                    default_keep_include.push(config.keep_include[i].replace('/', '_'));
                }
            }

            Rap.debug = config.debug;
            RapConfig.css = config.css;
            RapConfig.script = config.script;

            if (!config.default_page) {
                document.write("请配置默认页面default_page");
                return this;
            }

            Rap.default_page = config.default_page;
            if (config.filePostfix) {
                Rap.filePostfix = config.filePostfix;
            }
            if (config.onPageLoadError) {
                onPageLoadError = config.onPageLoadError;
            }
            var loadScript = null;
            var time = new Date().getTime();
            var p = Cache.open().then(function () {
                Rap.appVersion(config.app_version);
                if (config.comp_version) {
                    for (var key in config.comp_version) {
                        Rap.compVersion(key, config.comp_version[key]);
                    }
                }
                var loadCss = Rap.loadCss(config.css);
                loadScript = Rap.loadScript(config.script);
                return loadCss;
            }).then(function () {
                return loadScript
            }).then(function () {
                if (!window.Vue) {
                    Cache.clear();
                    if (localStorage.getItem('debug_reload') != 'true') {
                        localStorage.setItem('debug_reload', 'true');
                        location.reload();
                    }
                    return;
                }
                localStorage.removeItem('debug_reload');
                return Rap.install(Vue);
            }).then(function () {
                // Vue.config.silent = Rap.debug;
                // Vue.config.debug = Rap.debug;
                // Vue.config.devtools = Rap.debug;
                // Vue.config.productionTip = Rap.debug;
                // Vue.config.performance = Rap.debug;
                rap_ready = true;
                console.log('rap_init_time' + (new Date().getTime() - time));
                if (RapReady) {
                    RapReady();
                }
            }).catch(function (e) {
                console.log(e);
            });
            p.ready = p.then;
            return p;
        },
        ready: function (fun) {
            var p = P();
            var next = p.then(fun);
            RapReady = function () {
                p.resolve();
            };
            if (rap_ready) {
                RapReady();
            }
            return next;
        },
        app: function (app) {
            if (!app) {
                app = {}
            }
            if (!app.el) {
                app.el = "#app";
            }
            if (!app.mixins) {
                app.mixins = [];
            }
            app.mixins.push(Rap.MainView);
            var App = new Vue(app);
            Rap.onRouterChange();
            return App;
        },
        keep: function (page) {
            Rap.go(page, false, true);
        },
        go: function (page, replace, keep) {
            if (replace == null) {
                replace = false;
            }
            if (APPMainView.$children.length > 0) {

                var currentView = APPMainView.$children[APPMainView.$children.length - 1];
                var name = currentView.$options._componentTag;
                if (default_keep_include.indexOf(name) > -1) {
                    keep = true;
                }
                if (keep && keep_include.indexOf(name) == -1) {
                    keep_include.push(name);
                    APPMainView.keep_include = keep_include.join(',');
                }
            }
            IS_GO = true;
            var search = location.search;
            if (!search)search = "?";
            if (replace) {
                SCROLL_Y = window.scrollY;
                if (Rap.router_model == 'hash') {
                    history.replaceState(null, page, search + "#" + page);
                    Rap.onRouterChange();
                } else {
                    if (page.indexOf('/') != 0) {
                        page = '/' + page;
                    }

                    history.replaceState(null, page, '/' + Rap.history_base + page);
                    Rap.onRouterChange();
                    if (Rap.is_weixin) {
                        //微信ios浏览器路径不变化的坑
                        weixin_refresh_time = '#weixin_refresh_time=' + new Date().getTime();
                        location.hash = weixin_refresh_time;
                    }

                }

            }
            else {
                if (page.indexOf('http://') == 0 || page.indexOf('https://') == 0) {
                    location.href = page;
                } else {
                    SCROLL_Y = window.scrollY;
                    if (Rap.router_model == 'hash') {
                        location.href = search + "#" + page;
                    } else {
                        if (page.indexOf('/') != 0) {
                            page = '/' + page;
                        }
                        history.pushState(null, page, '/' + Rap.history_base + page);
                        Rap.onRouterChange();
                        if (Rap.is_weixin) {
                            //微信ios浏览器路径不变化的坑
                            weixin_refresh_time = '#weixin_refresh_time=' + new Date().getTime();
                            location.hash = weixin_refresh_time;
                        }
                    }
                }
            }
        },
        replace: function (page) {
            Rap.go(page, true);
        },
        back: function () {
            history.back();
        },
        install: function (Vue) {
            Vue.directive('link', {
                bind: function (el, binding, vnode) {
                    el.setAttribute("rap-link", binding.value);
                    var modifiers = binding.modifiers;
                    if (modifiers.replace) {
                        el.setAttribute("rap-replace", 'true');
                    }
                    if (modifiers.keep) {
                        el.setAttribute("rap-keep", 'true');
                    }
                    if (modifiers.back) {
                        el.setAttribute("rap-back", 'true');
                    }
                    if (binding.arg) {
                        el.setAttribute("rap-arg", binding.arg);
                    }
                    if (el.addEventListener) {
                        el.addEventListener('click', v_link_click, false);
                    }
                    //ie浣跨敤attachEvent锛屾潵娣诲姞浜嬩欢
                    else {
                        el.attachEvent("onclick", v_link_click);
                    }
                },
                update: function (el, binding, vnode) {
                    el.setAttribute("rap-link", binding.value);
                }, unbind: function (el, binding, vnode) {
                    if (el.removeEventListener) {
                        el.removeEventListener("click", v_link_click, false);
                    } else {
                        el.detachEvent("click", v_link_click);
                    }
                }
            });
            return Rap.init();
        },

        default_page: '',
        debug: false,
        filePostfix: 'html',
        RapAppVersion: 1,
        global_router: {
            query: {},
            search: [],
            page: '',
            hash: ''
        },
        baseUrl: "",
        isReady: false,
        $pageDefine: null,
        insertScript: function (src) {
            return InsertScript.insert(src);
        },
        loadScript: function (url, raw) {
            var p = P();
            if (!url) {
                p.resolve();
                return p;
            }
            if (url instanceof Array) {
                //鍚屾椂杩涜涓€姝ュ姞杞�
                var promise = Rap.promise().resolve();
                for (var i = 0; i < url.length; i++) {
                    (function () {
                        var link = url[i];
                        var load = Rap.loadScript(link, true);
                        promise = promise.then(function (data) {
                            if (data) {
                                var define = evalJS(data.url, data.content);
                            }
                            return load;
                        });
                    })();
                }
                promise = promise.then(function (data) {
                    if (data) {
                        evalJS(data.url, data.content);
                    }
                });
                return promise;
            } else {
                if (url.indexOf('?') != -1) {
                    url += '&';
                } else {
                    url += '?';
                }
                url += 'v=' + Rap.RapAppVersion;
                //宸插姞杞借繃
                var index = scripts_loaded.indexOf(url);
                if (index > -1) {
                    p.resolve();
                    return p;
                }
                scripts_loaded.push(url);
                Cache.get(url).then(function (content) {
                    if (!Rap.debug && content) {
                        try {
                            if (!raw) {
                                evalJS(url, content);
                            }
                            p.resolve({url: url, content: content});
                            return p;
                        } catch (e) {
                            Cache.remove(url);
                        }
                    }
                    rapGet(url).then(function (content) {
                        if (!raw) {
                            evalJS(url, content);
                        }
                        Cache.set(url, content);
                        p.resolve({url: url, content: content});
                    });
                });

            }
            return p;
        },
        loadCss: function (url, raw) {
            var p = P();
            if (!url) {
                p.resolve();
                return p;
            }
            if (url instanceof Array) {
                var promise = Rap.promise().resolve();
                for (var i = 0; i < url.length; i++) {
                    (function () {
                        var link = url[i];
                        var load = Rap.loadCss(link, true);
                        promise = promise.then(function (data) {
                            if (data) {
                                addCss(data.url, data.content);
                            }
                            return load;
                        });
                    })();
                }
                return promise.then(function (data) {
                    if (data) {
                        addCss(data.url, data.content);
                    }

                });
            } else {
                if (url.indexOf('?') != -1) {
                    url += '&';
                } else {
                    url += '?';
                }
                url += 'v=' + Rap.RapAppVersion;
                Cache.get(url).then(function (content) {
                    if (!Rap.debug && content) {
                        if (!raw) {
                            addCss(url, content);
                        }
                        p.resolve({url: url, content: content});
                    } else {
                        rapGet(url).then(function (content) {
                            Cache.set(url, content);
                            if (!raw) {
                                addCss(url, content);
                            }
                            p.resolve({url: url, content: content});
                        });
                    }
                });

            }
            return p;

        },
        removeCss: function (url) {
            var el = document.getElementById(url);
            if (el) {
                if (el.hasAttribute('num')) {
                    var num = parseInt(el.getAttribute('num'));
                    if (num == 1) {
                        el.parentElement.removeChild(el);
                    } else {
                        el.setAttribute('num', num - 1);
                    }
                } else {
                    el.parentElement.removeChild(el);
                }

            }
        },
        compVersion: function (mod, version) {
            compVersion[mod] = version;
        },
        define: function () {
            var layout = null;
            var rely = null;
            var config = null;
            if (arguments.length > 2) {
                layout = arguments[0];
                rely = arguments[1];
                config = arguments[2]
            } else if (arguments.length > 1) {
                rely = arguments[0];
                config = arguments[1]
            } else {
                config = arguments[0];
            }
            if (!rely) {
                rely = [];
            }
            if (Rap.$IS_CREATE_COMP) {
                this.$pageDefine = {
                    layout: layout,
                    rely: rely,
                    config: config
                };
            } else {
                return loadRequire(layout, rely, config);
            }
        },
        appVersion: function (version) {
            Rap.RapAppVersion = version;
            var rap_v_k = Cache.getKey('RapAppVersion');
            var rapAppVersion = localStorage.getItem(rap_v_k);
            if (rapAppVersion && rapAppVersion != Rap.RapAppVersion) {
                Cache.clear();
            }
            localStorage.setItem(rap_v_k, Rap.RapAppVersion);
        },
        init: function () {
            Rap.isReady = true;
            var promise = Rap.promise().resolve();
            for (var k in require_init) {
                (function (k) {
                    var item = require_init[k];
                    var define = loadRequire(k, item.rely, item.config, item.layout);
                    promise = promise.then(function () {
                        return define;
                    })
                })(k)
            }
            return promise;
        },
        $create: function (url, name, option, thisCallBack) {
            var p = P();
            var style = option.style;
            var modName = name;
            var layout = this.$pageDefine.layout;
            if (layout) {
                layout = urlJoin(url, layout);
            }
            var rely = this.$pageDefine.rely;
            var config = this.$pageDefine.config;
            if (layout) {
                if (layout.indexOf('/') == 0) {
                    layout = layout.substr(1);
                }
                viewLines[modName] = layout.split('/').join('_');
            }
            var scrollY = 0;
            var childMixin = {
                data: function () {
                    return {
                        router: Rap.global_router,
                        RapViews: RapShareData.RapViews,
                        childView: null,
                        rap: {
                            page_activated: true
                        }
                    };
                },
                watch: {
                    'RapViews.index': function () {
                        if (!this.rap.page_activated)return;
                        this.$options.RapViews.apply(this);
                        var init = this.$options.init;
                        if (init) {
                            init.apply(this, [Rap.global_router.query, Rap.global_router.search]);
                        }
                    }
                },
                RapViews: function () {
                    var index = -1;
                    for (var i = 0; i < this.RapViews.items.length; i++) {
                        var name = this.RapViews.items[i];
                        if (name == modName) {
                            index = i;
                        }
                    }
                    if (index + 1 < this.RapViews.items.length) {
                        this.childView = this.RapViews.items[index + 1];
                    }
                },
                created: function () {
                    if (style) {
                        addCss(modName, style);
                    }
                    this.$options.RapViews.apply(this);
                    if (thisCallBack) {
                        thisCallBack(this);
                    }
                },
                activated: function () {
                    if (!this.rap.page_activated) {
                        addCss(modName, style);
                        setTimeout(function () {
                            document.documentElement.scrollTop = scrollY;
                            document.body.scrollTop = scrollY;
                            window.scrollTo(0, scrollY);
                        }, 2);
                        this.$options.RapViews.apply(this);
                        var init = this.$options.init;
                        if (init) {
                            init.apply(this, [Rap.global_router.query, Rap.global_router.search]);
                        }
                    }
                    this.rap.page_activated = true;
                },
                deactivated: function () {
                    this.rap.page_activated = false;
                    Rap.removeCss(modName);
                    scrollY = SCROLL_Y;
                },
                mounted: function () {
                    var init = this.$options.init;
                    if (init) {
                        init.apply(this, [Rap.global_router.query, Rap.global_router.search]);
                    }
                },
                destroyed: function () {
                    Rap.removeCss(modName);
                },
                methods: {}
            };

            childMixin.render = function (_c) {
                var render = option.render;
                if (typeof(render) == 'string') {
                    eval('render=' + option.render);
                }
                if (render) {
                    return render.call(this, _c);
                }
            };
            var staticRenderFns = option.staticRenderFns;
            if (typeof(staticRenderFns) == 'string') {
                childMixin.staticRenderFns = eval('[' + option.staticRenderFns + ']');
            } else {
                childMixin.staticRenderFns = option.staticRenderFns;
            }
            delete Rap.$pageDefine;
            // if (Rap.isReady) {
            //     loadLayoutAndRely(url, rely,config, layout).then(function (config) {
            //         if (!config.mixins) {
            //             config.mixins = [];
            //         }
            //         config.mixins.push(childMixin);
            //         Vue.component(modName, config);
            //         p.resolve();
            //     });
            // } else {
            loadRequire(url, rely, config, layout).then(function (config) {
                if (!config.mixins) {
                    config.mixins = [];
                }
                config.mixins.push(childMixin);
                Vue.component(modName, config);
                p.resolve();
            });
            // }

            return p;
        },
        loadUrl: function (url) {
            var path = url.split('/');
            var m = [];
            for (var i = 0; i < path.length; i++) {
                var item = path[i];
                if (!(parseInt(item) + "" == item || item.indexOf('@') == 0)) {
                    m.push(item);
                }
            }
            path = m;
            Rap.global_router.page = path.join('/');
            var as = routers[Rap.global_router.page];
            if (as) {
                if (typeof(as) == 'function') {
                    as(Rap.global_router.query, Rap.global_router.search);
                    return;
                } else {
                    Rap.global_router.page = as;
                }
            }
            var modName = Rap.global_router.page.split('/').join('_');
            if (Vue.component(modName)) {
                Rap.onViewChangeCallBack(modName);
            } else {
                this.loadMod(Rap.global_router.page).then(function () {
                    Rap.onViewChangeCallBack(modName);
                }).catch(function (e) {
                    console.log(Rap.global_router.page + '加载失败');
                    console.log(e);
                    if (onPageLoadError) {
                        onPageLoadError(Rap.global_router.page, e);
                    }
                });
            }
        },
        /**
         * 预加载模块 异步队列加载的 请使用 loadMod
         */
        preComp: function (url) {
            Rap.loadMod(url);
        },
        require: function (depends, callback) {
            if (!callback) {
                callback = {};
            }
            loadRequire('', depends, callback, '');
        },
        /**
         * 加载模块
         * @param url
         */
        loadMod: function (url) {
            var p = P();
            if (!url) {
                p.resolve();
                return p;
            }
            if (url instanceof Array) {
                p.resolve();
                for (var i = 0; i < url.length; i++) {
                    (function () {
                        var load = Rap.loadMod(url[i]);
                        p = p.then(function () {
                            return load;
                        });
                    })();
                }
                return p;
            } else {
                url = url.substr(url.indexOf('/') == 0 ? 1 : 0);
                var modUrl = this.baseUrl + url;
                var path = url.split('/');
                var modName = path.join('_');
                path.pop();
                url = path.join("/") + "/";
                if (Vue.component(modName)) {
                    p.resolve();
                    return p;
                }
                var key = Cache.getKey(modUrl + '.ver');
                var key_content = modUrl + '.rap';
                var version = Rap.RapAppVersion;
                if (compVersion[modUrl]) {
                    version = compVersion[modUrl];
                }
                function loadFromNet() {
                    var template = "";
                    var style = "";
                    var script = "";
                    var link = modUrl;
                    if (modUrl.indexOf('/') != 0 && Rap.router_model == 'history') {
                        link = '/' + Rap.history_base + '/' + modUrl;
                    }
                    return rapGet(link + '.' + Rap.filePostfix + '?version=' + version).then(function (content) {
                        var el = document.createElement('div');
                        el.innerHTML = content;
                        var links = [];
                        for (var i = 0; i < el.children.length; i++) {
                            var child = el.children[i];
                            if (child.tagName == "STYLE") {
                                style = child.innerHTML.trim();
                            } else if (child.tagName == "TEMPLATE") {
                                template = child.innerHTML;
                            } else if (child.tagName == "SCRIPT") {
                                script = child.innerHTML;
                            } else if (child.tagName == "LINK") {
                                var href = child.getAttribute('href');
                                links.push(href);
                            }
                        }
                        var promise = Rap.promise().resolve();
                        for (var i = 0; i < links.length; i++) {
                            (function (ii) {
                                promise = promise.then(function () {
                                    return rapGet(links[ii]).then(function (content) {
                                        style += "\b\r" + content;
                                    });
                                })
                            })(i);
                        }
                        return promise;
                    }).then(function () {
                        var compile = Vue.compile(template);
                        var lc = {
                            render: compile.render,
                            staticRenderFns: compile.staticRenderFns,
                            style: style,
                            script: script,
                            name: key_content,
                            base: url
                        };
                        localStorage.setItem(key, version);
                        var lc_json = {
                            render: compile.render.toString(),
                            staticRenderFns: compile.staticRenderFns.toString(),
                            style: style,
                            script: script,
                            name: key_content,
                            base: url
                        };
                        Cache.set(key_content, JSON.stringify(lc_json));
                        return lc;
                    }).then(function (lc) {
                        return evalScript(modUrl, url, modName, lc);
                    }).catch(function (e) {
                        console.log('url:' + link + " get error");
                        console.log(e);
                    });
                }

                var s_version = localStorage.getItem(key);
                if (!Rap.debug && s_version) {
                    if (s_version == version) {
                        var p = P();
                        Cache.get(key_content).then(function (content) {
                            var json = JSON.parse(content);
                            evalScript(modUrl, url, modName, json).then(function () {
                                p.resolve();
                            });
                        }).catch(function () {
                            Cache.remove(key_content);
                            loadFromNet().then(function () {
                                p.resolve();
                            });
                        });
                        return p;
                    } else {
                        Cache.remove(key_content);
                    }
                }
                return loadFromNet();

            }
        },
        $query: function () {
            var routerUrl = Rap.routerUrl();
            var query = {};
            if (routerUrl.indexOf('?') > -1) {
                routerUrl = routerUrl.substr(routerUrl.indexOf('?') + 1);
                var qs = routerUrl.split('&');
                for (var i = 0; i < qs.length; i++) {
                    var q = qs[i];
                    if (!q)continue;
                    var kv = q.split('=');
                    query[kv[0]] = kv[1];
                }
            }
            return query;
        },
        $search: function (ids) {
            var routerUrl = Rap.routerUrl();
            routerUrl = routerUrl.substr(routerUrl.indexOf('/') == 1 ? 2 : 1);
            if (routerUrl.indexOf('?') > -1) {
                routerUrl = routerUrl.substr(0, routerUrl.indexOf('?'));
            }
            var path = routerUrl.split('/');

            var m = [];
            var args = arguments;
            for (var i = 0; i < path.length; i++) {
                var item = path[i];
                if (parseInt(item) + "" == item) {
                    m.push(item);
                } else if (item.indexOf('@') == 0) {
                    m.push(item.substr(1));
                }
            }
            if (args.length > 0) {
                var result = {};
                for (i = 0; i < args.length; i++) {
                    result[args[i]] = m[i];
                }
                return result;
            }
            return m;
        }
        , routerCall: null,
        onHash: function (call) {
            this.routerCall = call;
        },
        onRouter: function (call) {
            this.routerCall = call;
        },
        onRouterChange: function (e) {
            if (weixin_refresh_back) {
                weixin_refresh_back = false;
                return;
            }
            if (Rap.is_weixin && weixin_refresh_time && location.hash == weixin_refresh_time) {
                weixin_refresh_back = true;
                //微信浏览器的坑解决
                history.back();
                return;
            }
            if (!IS_GO && APPMainView.$children.length > 0) {
                var last = APPMainView.$children[APPMainView.$children.length - 1].$options._componentTag;
                var index = keep_include.indexOf(last);
                if (index > -1) {
                    keep_include.splice(index, 1);
                    APPMainView.keep_include = keep_include.join(',');
                }
            }
            if (IS_GO) {
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                window.scrollTo(0, 0);
            }
            IS_GO = false;

            var routerUrl = Rap.routerUrl();
            if (Rap.routerCall && Rap.routerCall(routerUrl)) {
                return;
            }
            if (!routerUrl && Rap.default_page) {
                Rap.replace(Rap.default_page);
                return;
            }
            routerUrl = routerUrl.substr(routerUrl.indexOf('/') == 1 ? 2 : 1);
            Rap.global_router.hash = routerUrl;

            if (routerUrl.indexOf('?') > -1) {
                routerUrl = routerUrl.substr(0, routerUrl.indexOf('?'));
            } else if (routerUrl.indexOf('&') > -1) {
                routerUrl = routerUrl.substr(0, routerUrl.indexOf('&'));
            } else if (routerUrl.indexOf('&') > -1) {
                routerUrl = routerUrl.substr(0, routerUrl.indexOf('&'));
            }
            for (var key in Rap.global_router.query) {
                delete Rap.global_router.query[key]
            }
            var query = Rap.$query();
            for (var key in query) {
                var value = query[key];
                if (parseInt(value) + "" == value) {
                    value = parseInt(value);
                }
                Vue.set(Rap.global_router.query, key, value);
            }
            Rap.global_router.search.length = 0;
            var search = Rap.$search();
            for (var i = 0; i < search.length; i++) {
                var value = search[i];
                if (parseInt(value) + "" == value) {
                    value = parseInt(value);
                }
                Rap.global_router.search.push(value);
            }
            Rap.loadUrl(routerUrl);
        },
        onViewChangeCallBack: null,
        onViewChange: function (fun) {
            this.onViewChangeCallBack = fun;
        },
        router: function (hash, as) {
            hash = hash.substr(hash.indexOf('/') == 0 ? 1 : 0);
            as = as.substr(as.indexOf('/') == 0 ? 1 : 0);
            routers[hash] = as;
        }
    };


    var RapShareData = {
        RapViews: {
            index: 1,
            items: []
        },
        router: Rap.global_router,
        childView: '',
        keep_include: 'rap_main'
    };


    var keep_include = ['rap_main'];
    var APPMainView = null;
    Rap.MainView = {
        data: function () {
            return RapShareData;
        },
        watch: {
            'RapViews.index': {
                handler: function () {
                    this.childView = this.RapViews.items[0];
                }, deep: true
            }
        },
        created: function () {
            APPMainView = this;
            if (this.RapViews.items.length > 0) {
                this.childView = this.RapViews.items[0];
            }
        }
    };
    function currentItems(items, view) {
        items.push(view);
        var layout = viewLines[view];
        if (layout) {
            currentItems(items, layout);
        }
    }

    Rap.onViewChange(function (view) {
        var items = [];
        currentItems(items, view);
        items = items.reverse();
        RapShareData.RapViews.items = items;
        RapShareData.RapViews.index++;
        console.log(RapShareData.RapViews);
    });
    window.addEventListener("popstate", Rap.onRouterChange, false);
    Rap.build = function (file) {
        var div = document.createElement("div");
        div.setAttribute('style', "width: 100%;height: 100%; background: white;position: fixed;left: 0;right: 0;text-align: center;padding-top: 30px;top: 0;z-index: 10000;font-size: 21px;");
        div.textContent = "编译中...";
        document.body.appendChild(div);
        function buildJs() {
            Cache.pack().then(function (js) {
                div.textContent = "编译完成...,文件为非压缩版本需要自行压缩,在线压缩工具";
                var a = document.createElement("a");
                a.setAttribute('href', 'https://tool.lu/js/');
                a.textContent = 'https://tool.lu/js/';
                div.appendChild(a);
                doSave(js, 'text/javascript', 'rap-all.js');
            });
        }

        function doSave(value, type, name) {
            var blob;
            if (typeof window.Blob == "function") {
                blob = new Blob([value], {type: type});
            } else {
                var BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder;
                var bb = new BlobBuilder();
                bb.append(value);
                blob = bb.getBlob(type);
            }
            var URL = window.URL || window.webkitURL;
            var bloburl = URL.createObjectURL(blob);
            var anchor = document.createElement("a");
            if ('download' in anchor) {
                anchor.style.visibility = "hidden";
                anchor.href = bloburl;
                anchor.download = name;
                document.body.appendChild(anchor);
                var evt = document.createEvent("MouseEvents");
                evt.initEvent("click", true, true);
                anchor.dispatchEvent(evt);
                document.body.removeChild(anchor);
            } else {
                location.href = bloburl;
            }
        }

        if (!file) {
            buildJs();
            return;
        }
        rapGet(file + '.json').then(function (content) {
            content = JSON.parse(content);
            function renderUrl() {
                var url = content.pop();
                Rap.go(url);
                if (content.length > 0) {
                    setTimeout(renderUrl, 500);
                } else {
                    buildJs();
                }
            }

            renderUrl();
        });
    };
    Rap.promise = P;
    Rap.cache = Cache;
    //弹框
    Rap.showPopup = function (url, config) {
        Rap.loadMod(url).then(function () {
            url = url.split('/').join('_');
            if (!config) {
                config = {};
            }
            if (url.indexOf('_') == 0) {
                url = url.substr(1);
            }
            config.el = document.createElement('div');
            if (!config.methods) {
                config.methods = {};
            }
            config.methods.$close = function (done) {
                if (done && typeof(done) == 'function') {
                    done();
                }
                instance.$el.parentElement.removeChild(instance.$el);
                instance.$destroy();
            };
            var instance = new (Vue.extend(Vue.component(url)))(config);
            document.body.appendChild(instance.$el);
        });
    };
    Rap.version = '1.3.2';


    function checkUa() {
        var ua = window.navigator.appVersion.toLowerCase();
        Rap.is_weixin = ua.indexOf('micromessenger') > -1;
        Rap.is_android = ua.indexOf('android') > -1;
        Rap.is_iphone = ua.indexOf('iphone') > -1;
        Rap.is_ipad = ua.indexOf('ipad') > -1;
        Rap.is_ios = Rap.is_iphone || Rap.is_ipad;
        Rap.is_android_mobile = Rap.is_android && ua.indexOf('mobile') > -1;
        Rap.is_android_pad = Rap.is_android && ua.indexOf('mobile') == -1;
    }

    if (location.hash.indexOf('#weixin_refresh_time') > -1) {
        history.replaceState(null, '', "#");
    }
    checkUa();
    return Rap;
});