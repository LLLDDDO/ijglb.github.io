/* vue-rap v1.2.3 | (c) 2018 by tengzhinei */
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
                    success_arg = res;
                    result = 1;
                    if (success) {
                        nextCall();
                    }
                    return this;
                },
                reject: function (res) {
                    error_arg = res;
                    result = 2;
                    if (error) {
                        error(error_arg);
                    } else if (next) {
                        next.reject(res);
                    }
                    return this;
                },
                then: function (call, e) {
                    next = P();
                    success = call;
                    error = e;
                    if (result == 1) {
                        nextCall();
                    } else if (result == 2 && error) {
                        error(error_arg);
                    }
                    next.parent = this;
                    return next;
                },
                catch: function (e) {
                    error = e;
                    if (result == 2) {
                        error(error_arg);
                    }
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
        };
        request.send();
        return p;
    }


    var viewLines = {};
    var routers = {};
    var RapConfig = {script: [], css: []};

    var Cache = {
        get: function (key) {
            return localStorage.getItem(key);
        },
        set: function (key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                //内容已满删除非必要缓存
                var length = this.count();
                var js = "";
                for (var i = 0; i < length; i++) {
                    var k = this.key(i);
                    if (key.indexOf('.rap') == key.length - 4 || key.indexOf('.ver') == key.length - 4) {
                        this.remove(k);
                    } else if (key.indexOf('.js') > -1 && RapConfig.script.indexOf(k) < 0) {
                        this.remove(k);
                    } else if (key.indexOf('.css') > -1 && RapConfig.css.indexOf(k) < 0) {
                        this.remove(k);
                    }
                }
                try {
                    localStorage.setItem(key, value);
                } catch (e) {

                }
            }
        }, remove: function (key) {
            localStorage.remove(key);
        }, clear: function () {
            localStorage.clear();
        }, count: function () {
            return localStorage.length;
        }, key: function (index) {
            return localStorage.key(index);
        }
    };

    function urlJoin(base, url) {
        if (url.indexOf('/') == 0) {
            return url;
        }
        if (!(url.indexOf('/') > -1 && url.indexOf('.') > -1)) {
            return base + url;
        }
        var p = base.split("/");
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
        var p =  Rap.loadMod(layout);
        if(rely){
            for(var i=0;i<rely.length;i++){
                (function () {
                    var load = Rap.loadMod(urlJoin(url, rely[i]));
                    p=p.then(function () {
                        return load;
                    });
                })();
            }
        }
        return p;
    }

    var head = document.getElementsByTagName("head")[0];

    function evalScript(modUrl, url, modName, config) {
        // style,template,script
        var p = P();
        var script = config.script;
         script = "(function(url,name,config,p){\n if(Rap.debug){console.log('模块加载: '+modName);}" + script + ";\nRap.$create(url,name,config).then(function(){p.resolve();});\n})(url,modName,config,p)\n";
        if (Rap.debug) {
            script += "//@ sourceURL=" + modUrl;
        }
        eval(script);
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
        if (el || !content) {
            var num = parseInt(el.getAttribute('num'));
            el.setAttribute('num', num + 1);
            return;
        }
        var style = document.createElement('style');
        style.type = 'text/css';
        style.id = id;
        style.setAttribute('num', 1);
        style.innerHTML = content;
        head.appendChild(style);
    }


    var layoutAndRely = [];

    var compVersion = {};

    var preMod = [];

    var preModLoading = false;

    var scripts_loaded = [];

    var rap_ready = false;

    function v_link_click(event, m) {
        var el = event.currentTarget;
        var link = el.getAttribute("rap-link");
        if (!link) {
            console.log(el);
        }
        var replace = el.getAttribute("rap-replace");
        var back = el.getAttribute("rap-back");
        if (back == 'true') {
            Rap.back();
            return;
        }
        var arg = el.getAttribute("rap-arg");
        Rap.go(link, replace == 'true');
    }

    var RapReady = null;


    var Rap = {
        config: function (config) {
            Rap.debug = config.debug;
            RapConfig.css = config.css;
            RapConfig.script = config.script;

            if (!config.default_page) {
                document.write("请配置默认页面default_page");
                return this;
            }

            Rap.default_page = config.default_page;
            Rap.appVersion(config.app_version);
            if (config.comp_version) {
                for (var key in config.comp_version) {
                    Rap.compVersion(key, config.comp_version[key]);
                }
            }
            var loadCss = Rap.loadCss(config.css);
            var loadScript = Rap.loadScript(config.script);
            Rap.promise(function () {
                return loadCss;
            }).then(function () {
                return loadScript
            }).then(function () {
                if (!window.Vue) {
                    document.write("请在script配置Vue对应的文件路径");
                    return;
                }
                Rap.install(Vue);
            });
            return this;
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
            Rap.onhashchange();
            return App;
        },
        go: function (page, replace) {
            if (replace == null) {
                replace = false;
            }
            if (replace) {
                history.replaceState(null, page, "#" + page);
                Rap.onhashchange();
            }
            else {
                if (page.indexOf('http://') == 0 || page.indexOf('https://') == 0) {
                    location.href = page;
                } else {
                    location.href = "#" + page;
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
                    if (modifiers.back) {
                        el.setAttribute("rap-back", 'true');
                    }
                    if (binding.arg) {
                        el.setAttribute("rap-arg", binding.arg);
                    }
                    if (el.addEventListener) {
                        el.addEventListener('click', v_link_click, false);
                    }
                    //ie使用attachEvent，来添加事件
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
            Rap.init();
        },

        default_page: '',
        debug: false,
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
        loadScript: function (url, raw) {
            var p = P();
            if (!url) {
                p.resolve();
                return p;
            }
            if (url instanceof Array) {
                //同时进行一步加载
                var promise = Rap.promise().resolve();
                for (var i = 0; i < url.length; i++) {
                    (function () {
                        var link = url[i];
                        var load = Rap.loadScript(link, true);
                        promise = promise.then(function (data) {
                            if (data) {
                                evalJS(data.url, data.content);
                            }
                            return load;
                        });
                    })();
                }
                promise.then(function (data) {
                    if (data) {
                        evalJS(data.url, data.content);
                    }
                    p.resolve();
                });
            } else {
                //已加载过
                var index = scripts_loaded.indexOf(url);
                if (index > -1) {
                    p.resolve();
                    return p;
                }
                scripts_loaded.push(url);
                var content = Cache.get(url);
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
                promise.then(function (data) {
                    if (data) {
                        addCss(data.url, data.content);
                    }
                    p.resolve();
                });
            } else {
                var content = Cache.get(url);
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
            this.$pageDefine = {
                layout: layout,
                rely: rely,
                config: config
            };
        },
        appVersion: function (version) {
            Rap.RapAppVersion = version;
            var rapAppVersion = Cache.get('RapAppVersion');
            if (rapAppVersion && rapAppVersion != Rap.RapAppVersion) {
                Cache.clear();
            }
            Cache.set('RapAppVersion', Rap.RapAppVersion);
        },
        init: function () {
            Rap.isReady = true;
            Cache.set('RapAppVersion', Rap.RapAppVersion);

            var promise= Rap.promise().resolve();
            for(var i=0;i<layoutAndRely.length;i++){
                (function () {
                    var param = layoutAndRely[i];
                    var load=loadLayoutAndRely(param.url, param.rely, param.layout);
                    promise = promise.then(function () {
                        return load;
                    });
                })();
            }
            promise.then(function () {
                rap_ready = true;
                if (RapReady) {
                    RapReady(Rap);
                }
            });
        },
        $create: function (url, name, option) {
            var p = P();
            var template = option.template;
            var style = option.style;
            var modName = name;
            var layout = this.$pageDefine.layout;
            if (layout) {
                layout = urlJoin(url, layout);
            }
            var rely = this.$pageDefine.rely;
            var config = this.$pageDefine.config;
            config.template = template;
            if (layout) {
                if (layout.indexOf('/') == 0) {
                    layout = layout.substr(1);
                }
                viewLines[modName] = layout.split('/').join('_');
            }
            var childMixin = {
                data: function () {
                    return {
                        router: Rap.global_router,
                        RapViews: RapShareData.RapViews,
                        childView: null
                    };
                },
                watch: {
                    'RapViews.index': function () {
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
                },
                activated: function () {
                    addCss(modName, style);
                },
                deactivated: function () {
                    Rap.removeCss(modName);
                },
                mounted: function () {
                    var init = this.$options.init;
                    if (init) {
                        init.apply(this, [Rap.global_router.query, Rap.global_router.search]);
                    }
                    if (!option.render) {
                        option.render = this.$options.render.toString();
                        option.staticRenderFns = this.$options.staticRenderFns.toString();
                        delete option.template;
                        Cache.set(option.name, JSON.stringify(option));
                    }
                },
                destroyed: function () {
                    Rap.removeCss(modName);
                },
                methods: {}
            };

            if (option.render) {
                childMixin.render = function (_c) {
                    eval('var render=' + option.render);
                    if (render) {
                        return render.call(this, _c);
                    }
                }
            }
            if (option.staticRenderFns) {
                childMixin.staticRenderFns = eval('[' + option.staticRenderFns + ']');
            }
            if (!config.mixins) {
                config.mixins = [];
            }
            config.mixins.push(childMixin);
            Vue.component(modName, config);
            if (Rap.isReady) {
                loadLayoutAndRely(url, rely, layout).then(function () {
                    p.resolve();
                });
            } else {
                layoutAndRely.push({
                    'url': url,
                    'rely': rely,
                    'layout': layout
                })
            }
            delete Rap.$pageDefine;
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
                if (isFunction(as)) {
                    as(Rap.global_router.query, Rap.global_router.search);
                } else {
                    Rap.global_router.page = as;
                }
                return;
            }
            var modName = Rap.global_router.page.split('/').join('_');
            if (Vue.component(modName)) {
                Rap.onViewChangeCallBack(modName);
            } else {
                this.loadMod(Rap.global_router.page).then(function () {
                    Rap.onViewChangeCallBack(modName);
                });
            }
        },
        /**
         * 预加载模块 异步队列加载的
         */
        preComp: function (url) {
            Rap.loadMod(url);
        },
        /**
         * 同步加载模块
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
                for (var i=0;i<url.length;i++){
                    (function () {
                        var load =  Rap.loadMod(url[i]);
                        p.then(function () {
                            return load;
                        });
                    })();
                }
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
                var key = modUrl + '.ver';
                var key_content = modUrl + '.rap';
                var version = Rap.RapAppVersion;
                if (compVersion[modUrl]) {
                    version = compVersion[modUrl];
                }
                if (!Rap.debug) {
                    var content = Cache.get(key);
                    if (content) {
                        if (content == version) {
                            try {
                                content = Cache.get(key_content);
                                var json = JSON.parse(content);
                                evalScript(modUrl + ".js", url, modName, json).then(function () {
                                    p.resolve();
                                });
                                return p;
                            } catch (e) {
                                Cache.remove(key_content);
                            }
                        } else {
                            Cache.remove(key_content);
                        }
                    }
                }
                rapGet(modUrl + '.html?version=' + version).then(function (content) {
                    var el = document.createElement('div');
                    el.innerHTML = content;
                    var style = "";
                    var template = "";
                    var script = "";
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

                    promise.then(function () {
                        var lc = {
                            style: style,
                            template: template,
                            script: script,
                            name: key_content,
                            base: url
                        };
                        Cache.set(key, version);
                        Cache.set(key_content, JSON.stringify(lc));
                        return lc;
                    }).then(function (lc) {
                        return evalScript(modUrl + ".js", url, modName, lc);
                    }).then(function () {
                        p.resolve();
                    });

                }).catch(function () {
                    console.log('url:' + modUrl + " get error")
                });
            }
            return p;
        },
        $query: function () {
            var hash = window.location.hash;
            var query = {};
            if (hash.indexOf('?') > -1) {
                hash = hash.substr(hash.indexOf('?') + 1);
                var qs = hash.split('&');
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
            var hash = window.location.hash;
            hash = hash.substr(hash.indexOf('/') == 1 ? 2 : 1);
            if (hash.indexOf('?') > -1) {
                hash = hash.substr(0, hash.indexOf('?'));
            }
            var path = hash.split('/');

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
        , hashCall: null,
        onHash: function (call) {
            this.hashCall = call;
        },
        // $at_event:false,
        onhashchange: function (e) {
            var hash = window.location.hash;
            if (Rap.hashCall && Rap.hashCall(hash)) {
                return;
            }
            if (!hash && Rap.default_page) {
                Rap.replace(Rap.default_page);
                return;
            }
            hash = hash.substr(hash.indexOf('/') == 1 ? 2 : 1);
            Rap.global_router.hash = hash;

            if (hash.indexOf('?') > -1) {
                hash = hash.substr(0, hash.indexOf('?'));
            } else if (hash.indexOf('&') > -1) {
                hash = hash.substr(0, hash.indexOf('&'));
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
            Rap.loadUrl(hash);
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
        childView: ''
    };

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
    });
    window.addEventListener("popstate", Rap.onhashchange, false);
    Rap.build = function (file) {
        var div = document.createElement("div");
        div.setAttribute('style', "width: 100%;height: 100%; background: white;position: fixed;left: 0;right: 0;text-align: center;padding-top: 30px;top: 0;z-index: 10000;font-size: 21px;");
        div.textContent = "编译中...";
        document.body.appendChild(div);
        function buildJs() {
            var length = Cache.count();
            var js = "";
            for (var i = 0; i < length; i++) {
                var key = Cache.key(i);
                if (key.indexOf('.rap') == key.length - 4) {
                    var content = Cache.get(key);
                    var json = JSON.parse(content);
                    var script = json.script;
                    delete json['script'];
                    var name = key.substr(0, key.length - 4).split('/').join('_');
                    js += "var url='" + json.base + "';var modName='" + name + "';var config=" + JSON.stringify(json) + ";(function(url,name,config){\n" + script + ";\nRap.$create(url,name,config);\n})(url,modName,config);\n";
                }
            }
            js = "(function () {" + js + "})();";
            div.textContent = "编译完成...,文件为压缩版本需要自行压缩,在线压缩工具<a href='https://tool.lu/js/'> https://tool.lu/js/</a>";
            doSave(js, 'text/javascript', 'rap-all.js');
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
            } else if (navigator.msSaveBlob) {
                navigator.msSaveBlob(blob, name);
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
    return Rap;
});