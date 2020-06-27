Rap.define('/global.js', [], function () {
    Rap.ready(function () {

    }).then(function () {
        window.App = Rap.app({
            el: '#app',
            data: {
                info :{
                    ptitle : "",
                    page : ""
                },
                contentHeight: {}
            },
            mounted: function(){
                window.onresize = () => {
                    return (() => {
                        this.changeContentHeight();
                    })()
                }
                this.changeContentHeight();
            },
            computed:{
                home : function (){
                    return this.info.page == "home";
                },
                site : function (){
                    return this.info.page == "site";
                },
                links : function (){
                    return this.info.page == "links";
                }
            },
            watch: {
                info: {
                    handler: function (newInfo) {
                        document.title = newInfo.ptitle + ' - 极光萝卜';
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