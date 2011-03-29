var userInfo;

bootstrap();

/**
 * Bootstrapping.
 */
function bootstrap()
{
	// jQuery ready
	$(document).ready(function(){
		$('#updated').hide();		
		$('body').keyup(function(event) {
          if (event.keyCode == '37') {
            onPrev();
            event.preventDefault();
            return false;
          } else if (event.keyCode == '39') {
            onNext();
            event.preventDefault();
            return false;
          }
        });
	    initializeWeiboJS();
	});
}

/**
 * Bootstrap Weibo-JS library.
 */
function initializeWeiboJS() {

    WB.core.load(['connect', 'client'], function() {
        var cfg = {
            key: '690758237',
            xdpath: 'http://caichoi.com/tr/xd.html'
        };
        WB.connect.init(cfg);
        WB.client.init(cfg); 

	    // check if user is logged in
		setStateLoggedOut();
    });  
}

function onLogout()
{	
	if(WB.connect.checkLogin()) {
		WB.connect.logout(function() {
		    setStateLoggedOut();
		    window.location.reload();
		});
	}
}

function onLogin() {	
	    WB.connect.login(function() {
		    //window.location.reload();
		    getCurrentUserInfo();
	    });
}

function onAbout() {
    $('#about').slideToggle();
}

function setStateLoggedIn()
{
	$('#login-box').hide();
	$('#user-options').slideDown();
	$('#username').text(userInfo.screen_name);
	$('#about').slideUp();
	$('#toolbar').fadeIn();
	activeTimeLine = "/statuses/home_timeline.json";
	startPoll();
}

function setStateLoggedOut()
{
	$('#username').text('');
	$('#login-box').fadeIn();
    $('#user-options').hide();
    $('#about').slideDown();
    $('#toolbar').hide();
	userInfo = null;
	activeTimeLine = "/statuses/public_timeline.json";
	startPoll();
}

function getCurrentUserInfo() {
	WB.client.parseCMD(
		"/account/verify_credentials.json",
		function(result, success) {
			if(success) {
				userInfo = result;
				setStateLoggedIn();
			} else {
				setStateLoggedOut();
			}
		}, 
		{}, 
		{'method':'GET'}
	);
}


var activeTimeLine = "/statuses/public_timeline.json";
var pollThreadHandle = 0;

function startPoll() {
    clearTimeout(pollThreadHandle);
    pollThread();
}

function pollThread() {  
	WB.client.parseCMD(
		activeTimeLine,
		function(sResult, bStatus) {
			if(bStatus) {
				updateLatest(sResult);
				notify("同步完成");
			}
		}, {}, {'method':'GET'}
	);
	
	// poll every 5 min
	pollThreadHandle = setTimeout("pollThread()", 5 * 60 * 1000); 
}

function notify(msg) {
    $('#updated').text(msg).slideDown().delay(1000).slideUp();
}

var idx = 0;
var items = new Array();
var slideShowHandle = 0;
var slideShowInterval = 7 * 1000;

function updateLatest(latest) {
	
    clearTimeout(slideShowHandle);
	items = new Array();
	$.each(latest, function(i, entry) {
		items.push(render(entry));
	});
	
	idx = 0;
	nextItem();
	
}

function nextItem() {
    if(idx < 0) idx = 0;
	var item = items[idx];
	$('#stage-content').fadeOut(function(){
	    var content = $('#stage-content').empty()
	                                     .append(item)
	                                     .fadeIn();
	    $('#stage').animate({height:content.height()});
	});	
	
	idx = (idx + 1) % items.length;

	slideShowHandle = setTimeout("nextItem()", slideShowInterval);
}

function render(entry) {
	var d = $('<div>').addClass('status');
	$('<img>').attr('src', entry.user.profile_image_url).addClass('avatar').appendTo(d);
	$('<div>').text(entry.user.name).addClass('username').appendTo(d);
	$('<div>').text(entry.text).addClass('text').appendTo(d);
	if(entry.thumbnail_pic != null) {
		$('<a target="_blank">').attr('href', entry.original_pic).append(
			$('<img>').attr('src', entry.thumbnail_pic).addClass('thumbnail-pic')
		).appendTo(d);
	}
	if(entry.retweeted_status != null) {
		var retweet = render(entry.retweeted_status);
		$(retweet).addClass('retweet');
		retweet.appendTo(d);
	}
	return d
}

var pause = false;
function togglePause() {
    pause = !pause;
    if(pause) {
        notify('继续自动播放');
        onResume();
    } else {
        notify('暂停播放');
        onPause();
    }   
}

function onPause() {
    $('#pause').text('继续');
    clearTimeout(slideShowHandle);
}

function onResume() {
    $('#pause').text('暂停');
    nextItem();
}

function onNext() {
    notify('下一个');
    clearTimeout(slideShowHandle);
    nextItem();
    onPause();
}

function onPrev() {
    notify('前一个');
    clearTimeout(slideShowHandle);
    idx -= 2;
    nextItem();
    onPause();
}
