<style>
.mdui-card-content { font-size: inherit;}
</style>
<template>
    <div class="mdui-card-content mdui-typo">
        <p v-for="site in sites" :key="site.title">{{site.title}}：<a :href="site.url" target="_blank" >{{site.url}}</a></p>
    </div>
</template>
<script>
    Rap.define("",[],{
        data: function(){
            return {
                sites:[
                    { title:"博客备份",url:"https://blogbak.ijglb.com"},
                    { title:"Steam上的中文Galgame",url:"https://steamgalgame.com"},
                    { title:"萝卜の图站",url:"https://img.ijglb.com"},
                    { title:"服务器监控",url:"https://status.ijglb.com"}
                ]
            }
        },
        init:function () {
            this.$emit('update:ptitle', "我的站点");
        }
    })
</script>