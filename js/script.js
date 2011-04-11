/*
[The BSD License]
Copyright (c) 2011, Shaoting Cai
All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of the author nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

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
		$('#post-panel').dialog({
		    title: '发表微博',
		    resizable: false,
		    autoOpen: false,
		    modal:true,
		    height: 450,
		    width: 600,
		    buttons: [
		        { text:"发表", click:onSubmitPost, id:'post-submit' },
		        { text:"取消", click:function() { $(this).dialog('close'); } }		        
		    ]
		});
			
		$(document).keydown(function(event) {
          if (event.keyCode == '37') {
            onPrev();
          } else if (event.keyCode == '39') {
            onNext();
          } else {
            return true;
          }

          event.preventDefault();
          return false;
      
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

		$('#login-box').animate({
		  height:"60px",
		  opacity:"1"
		});
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

var idx = 0;

// Current tweets JSON data.
var tweets;

function startPoll() {
    clearTimeout(pollThreadHandle);
    pollThread();
}

function pollThread() {  
	WB.client.parseCMD(
		activeTimeLine,
		function(sResult, bStatus) {
			if(bStatus) {
			    tweets = sResult;
				updateLatest();
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


function updateLatest() {	
    $('#stage-wait').remove();
    // show items
    var carousel = $('#carousel').empty();

    // Total cache cards must be odd number. The middle one is the main card.
    // The rest are just buffer cards.
    for(var i = 0; i < 5; i++)
        carousel.append(renderInCard(tweets[i]).fadeIn());

    // index of the middle card
	idx = 3;
}

function onCardClicked(event) {
    var that = $(event.target);
    var data = that.data('entry');
}

function renderInCard(entry) {
    return $('<div>').addClass('card').append(render(entry));
}

function render(entry) {
	var d = $('<div>').addClass('status');
	d.data('entry', entry);
	d.click(onCardClicked);
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
	return d;
}

var ANIMATE_SPEED = 500;
var canMove = true;
function onNext() {
    if(idx <= tweets.length - 1)
        onMove(true);
}

function onPrev() {
    if(idx >= 2)
        onMove(false);
}

function onMove(isSlideToLeft) {
    if(!canMove) return false;
    
    canMove = false;
    var cardToDiscard, cardToAdd, fnAddAndRemove;
    if(isSlideToLeft) {
        cardToDiscard = $('#carousel .card:first');
        idx++;
        cardToAdd = renderInCard(tweets[idx+1]);
        // dead card on the left, slide dead card
        cardToDiscard.animate(
            {width:0, height:0},
            ANIMATE_SPEED,            
            function() {                
                $('#carousel').append(cardToAdd);
                cardToDiscard.remove();                
                canMove = true;
            }
        );
    } else {
        cardToDiscard =  $('#carousel .card:last');
        idx--;
        cardToAdd = renderInCard(tweets[idx-1]);
        // dead card on the right, slide new card
        cardToDiscard.remove();                
        cardToAdd.width(0).animate({width:580}, ANIMATE_SPEED);         
        $('#carousel').prepend(cardToAdd);
        canMove = true;
    }
    
    

    return false;
}

function onShowPostForm() {
    $('#post-panel').dialog('open');
}

function onSubmitPost() {
    var content = $('#post-content').val();
    WB.client.parseCMD( 
        "/statuses/update.json", 
        function(sResult, bStatus) {
            if(bStatus == true){
                $('#post-content').val('');
            } else {
                alert('Ooops! Bug...tell Shaoting.');
            }
            $('#post-panel').dialog('close');
            startPoll();
        }, 
        {
            status : content
        },
        {
            method: 'post'
        }
    );

}

function onPostContentChanged() {
    var len = $('#post-content').val().length;
    $('#post-chars-left').text(140 - len);
    if(len > 140)
        $('#post-submit').button( "disable" );
    else 
        $('#post-submit').button( "enable" );
}
