<style>
.links a { text-decoration: none; }
</style>
<template>
    <div class="mdui-card-content">
        <div class="mdui-row-xs-1 mdui-row-sm-2 mdui-row-md-4 links">
            <a v-for="link in links" :key="link.name" :title="link.desc" :href="link.url" target="_blank" class="mdui-col mdui-m-b-1">
                <div class="mdui-card mdui-hoverable">
                    <div class="mdui-card-header">
                        <img class="mdui-card-header-avatar" :src="link.avatar">
                        <div class="mdui-card-header-title">{{link.name}}</div>
                        <div class="mdui-card-header-subtitle">{{link.desc}}</div>
                    </div>
                </div>
		    </a>
        </div>
        <div class="mdui-typo">
            <hr/>
            <p>如何出现在这里：</p>
            <p>自行向该文件：<a href="https://github.com/ijglb/ijglb.github.io/blob/master/data/links.json" target="_blank">https://github.com/ijglb/ijglb.github.io/blob/master/data/links.json</a> 添加你的站点信息并提交PR即可。</p>
            <P>不要求你的站点一定要添加我的链接，不过如果有的话就更好了~</P>
        </div>
    </div>
</template>
<script>
    Rap.define("",[],{
        data: function(){
            return {
                links:[]
            }
        },
        init:function () {
            this.$emit('update:ptitle', "友链");
            this.$emit('update:page', "links");
        },
        created:function(){
            var that = this;
            $$.ajax({
                method: 'GET',
                cache: false,
                dataType: 'json',
                url: './data/links.json',
                success: function (linkArr) {
                    linkArr.sort(function(){ return Math.random() - 0.5; });
                    that.links = linkArr;
                }
            });
        }
    })
</script>