Rap.define('/global.js', [], function () {
    Rap.ready(function () {

    }).then(function () {
        window.App = Rap.app({
            el: '#app',
            data: {
                info: {
                    ptitle: ""
                },
                contentHeight: {},
                navs: [
                    {
                        name: "首页",
                        icon: "home",
                        page: "page/home"
                    },
                    {
                        name: "站点",
                        icon: "apps",
                        page: "page/site"
                    },
                    {
                        name: "服务器监控",
                        icon: "cloud",
                        page: "page/server-status"
                    },
                    {
                        name: "友链",
                        icon: "link",
                        page: "page/links"
                    }
                ]
            },
            mounted: function(){
                window.onresize = () => {
                    return (() => {
                        this.changeContentHeight();
                    })()
                }
                this.changeContentHeight();
                //手动实例化tab解决vue渲染产生的神奇问题
                jglb.tab = new mdui.Tab('#nav');
            },
            computed:{
            },
            watch: {
                info: {
                    handler: function (newInfo) {
                        document.title = newInfo.ptitle + ' - 极光萝卜';
                    },
                    deep: true
                },
                router: {
                    handler: function (newRouter) {
                        //主要处理首次访问时tab选中问题
                        $$.each(this.navs, function (index, nav) {
                            if(newRouter.page == nav.page){
                                jglb.tab.show(index);
                            }
                        });
                    },
                    deep: true
                }
            },
            methods: {
                changeContentHeight: function () {
                    var height = window.innerHeight - $$('.mdui-tab').height() - $$('#footer').height() -8;
                    this.contentHeight = { 'min-height': height + "px" };
                }
            }
        });
    }).then(function () {
    }).catch(function (e) {
  
    });
});