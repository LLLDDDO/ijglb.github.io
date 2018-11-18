var $ = mdui.JQ;
/* 背景图片相关处理 */
$(document).ready(function () {
    var sacle = $(window).width() / $(window).height();
	if(sacle >= 1){
        SetBackroundImg('pc');
	}
    else {
        SetBackroundImg('mobile');
	}
});
$(window).on('resize',function () {
	var sacle = $(window).width() / $(window).height();
	if(sacle >= 1){
        SetBackroundImg('pc');
	}
    else {
        SetBackroundImg('mobile');
	}
});
function SetBackroundImg(action) {
    $('.cb-slideshow li span').each(function (i, element) {
        var url = 'https://img.ijglb.com/api.php?action=' + action + '&r=' + i;
        $(this).css('background-image', 'url(' + url + ')');
    });
}