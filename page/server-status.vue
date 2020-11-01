<style>
.servers .mdui-card-header .mdui-icon { font-size: 40px; }
.servers .mdui-card-header { padding: 8px;padding-bottom: 1px;height: 50px; }
.servers .mdui-card-content { padding: 8px;padding-top: 1px;transform: matrix(1, 0, 0, 1, 0, 0); }
.servers .mdui-card-content p { line-height: 9px; }
.servers .mdui-card-content .row { display: flex;margin-top:2px; }
.servers .mdui-card-content .title { width:25%; }
.servers .mdui-card-content .content { width:75%; }
.servers .mdui-progress { height: 24px; }
.servers .mdui-progress-determinate .progress { position:fixed; }
</style>
<template>
    <div class="mdui-card-content">
        <div class="mdui-row-xs-1 mdui-row-sm-2 mdui-row-md-4 servers">
            <div v-for="server in servers" :key="server.host" class="mdui-col mdui-m-b-1">
                <div class="mdui-card mdui-hoverable">
                    <div class="mdui-card-header">
                        <i :class="{ 'mdui-text-color-green' : server.online, 'mdui-text-color-red' : !server.online }" class="mdui-icon material-icons mdui-card-header-avatar mdui-typo-title">dns</i>
                        <div class="mdui-card-header-title">{{server.name}}</div>
                        <div class="mdui-card-header-subtitle">{{server.location}}</div>
                    </div>
                    <div class="mdui-card-content">
                        <div class="row">
                            <div class="title">在线时间：</div><div class="content">{{ server.online ? server.uptime : '-' }}</div>
                        </div>
                        <div class="row">
                            <div class="title">负载：</div><div class="content">{{ server.online ? server.load_1 : '-' }}</div>
                        </div>
                        <div class="row">
                            <div class="title">CPU：</div>
                            <div class="mdui-progress content">
                                <div class="mdui-progress-determinate" :style="{ width : (server.online ? server.cpu : 0) + '%'}">
                                    <div class="progress">{{ server.online ? server.cpu : '-' }} %</div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="title">内存：</div>
                            <div class="mdui-progress content">
                                <div class="mdui-progress-determinate" :style="{ width : (server.online ? ((server.memory_used/server.memory_total)*100.0).toFixed(0) : 0) + '%'}">
                                    <div class="progress">{{server.online ? bytesToSize(server.memory_used*1024,2) : '-'}} / {{ server.online ? bytesToSize(server.memory_total*1024,2) : '-'}}</div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="title">Swap：</div>
                            <div class="mdui-progress content">
                                <div class="mdui-progress-determinate" :style="{ width : (server.online ? ((server.swap_used/server.swap_total)*100.0).toFixed(0) : 0) + '%'}">
                                    <div class="progress">{{ server.online ? bytesToSize(server.swap_used*1024,2) : '-'}} / {{ server.online ? bytesToSize(server.swap_total*1024,2) : '-'}}</div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="title">硬盘：</div>
                            <div class="mdui-progress content">
                                <div class="mdui-progress-determinate" :style="{ width : (server.online ? ((server.hdd_used/server.hdd_total)*100.0).toFixed(0) : 0) + '%'}">
                                    <div class="progress">{{ server.online ? bytesToSize(server.hdd_used*1024*1024,2) : '-'}} / {{ server.online ? bytesToSize(server.hdd_total*1024*1024,2) : '-'}}</div>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="title">月流量：</div><div class="content">入：{{ server.online ? bytesToSize(server.network_in,2) : '-'}} | 出：{{ server.online ? bytesToSize(server.network_out,2) : '-'}}</div>
                        </div>
                        <div class="row">
                            <div class="title">网络：</div><div class="content">入：{{ server.online ? bytesToSize(server.network_rx,2) : '-'}} | 出：{{ server.online ? bytesToSize(server.network_tx,2) : '-'}}</div>
                        </div>
                    </div>
                </div>
		    </div>
        </div>
        <div class="mdui-typo">
            <hr/>
            <p>{{ updated ? ('最后更新时间：' + new Date(parseInt(updated)*1000).toLocaleString()) : '加载中...'}}</p>
        </div>
    </div>
</template>
<script>
    Rap.define("",[],{
        data: function(){
            return {
                servers: [],
                updated: "",
                doAjax: false
            }
        },
        init: function () {
            this.$emit('update:ptitle', "服务器状态监控");
        },
        created: function(){
            this.getData();
            this.timer = setInterval(this.getData, 2000);
        },
        beforeDestroy: function(){
            clearInterval(this.timer);
        },
        methods: {
            getData: function (){
                if(!this.doAjax){
                    this.doAjax = true;
                    var that = this;
                    $$.ajax({
                        method: 'GET',
                        cache: false,
                        timeout: 10000,
                        dataType: 'json',
                        url: 'https://674665939.xyz/json/stats.json',
                        success: function (data) {
                            that.updated = data.updated;
                            $$.each(data.servers, function (index, server) {
                                server.online = server.online4 || server.online6;
                            });
                            that.servers = data.servers;
                        },
                        complete: function(){
                            that.doAjax = false;
                        }
                    });
                }
            },
            bytesToSize: function (bytes, precision, si){
                var ret;
                si = typeof si !== 'undefined' ? si : 0;
                if(si != 0) {
                    var kilobyte = 1000;
                    var megabyte = kilobyte * 1000;
                    var gigabyte = megabyte * 1000;
                    var terabyte = gigabyte * 1000;
                } else {
                    var kilobyte = 1024;
                    var megabyte = kilobyte * 1024;
                    var gigabyte = megabyte * 1024;
                    var terabyte = gigabyte * 1024;
                }

                if ((bytes >= 0) && (bytes < kilobyte)) {
                    return bytes + ' B';

                } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
                    ret = (bytes / kilobyte).toFixed(precision) + ' K';

                } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
                    ret = (bytes / megabyte).toFixed(precision) + ' M';

                } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
                    ret = (bytes / gigabyte).toFixed(precision) + ' G';

                } else if (bytes >= terabyte) {
                    ret = (bytes / terabyte).toFixed(precision) + ' T';

                } else {
                    return bytes + ' B';
                }
                if(si != 0) {
                    return ret + 'B';
                } else {
                    return ret + 'iB';
                }
            }
        }
    })
</script>