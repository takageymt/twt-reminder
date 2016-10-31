// requirements
var twitter = require('twitter');
var schedule = require('node-schedule');
var cron = require('node-cron');
var async = require('async');
var fs = require('fs');
var rl = require('readline');

// log file
var logfile = 'schedule.log';

// Twitterbot's info
var bot = new twitter({
    consumer_key:'CONSUMER_KEY',
    consumer_secret:'CONSUMER_SECRET',
    access_token_key:'ACCESS_TOKEN_KEY',
    access_token_secret:'ACCESS_TOKEN_SECRET'
});
var bot_id = 'BOT_USER_ID';
var bot_name = 'BOT_SCREEN_NAME';

// Boot statuses
var lastTime = new Date();
var firstBoot = true;

// Japanese Description
function JapDate(data)
{
    this.year   = data.text.match(/\d+年/);
    this.month  = data.text.match(/\d+月/);
    this.day    = data.text.match(/\d+日/);
    this.hour   = data.text.match(/\d+時/);
    this.minute = data.text.match(/\d+分/);
    this.second = data.text.match(/\d+秒/);
}
JapDate.prototype.isNULL = function()
{
    if(this.year   != null) return false;
    if(this.month  != null) return false;
    if(this.day    != null) return false;
    if(this.hour   != null) return false;
    if(this.minute != null) return false;
    if(this.second != null) return false;
    return true;
};

// Other Description
function OthDate(data)
{
    this.year   = data.text.match(/\d+[\-\/]/); 
    this.month  = data.text.match(/[\-\/]\d+[\-\/]/);
    this.day    = data.text.match(/[\-\/]\d+(?!([\-\/]|\d))/);
    this.hour   = data.text.match(/\d+:/);
    this.minute = data.text.match(/:\d+:/);
    this.second = data.text.match(/:\d+(?!(:|\d))/);    
}
OthDate.prototype.isNULL = function()
{
    if(this.year   != null) return false;
    if(this.month  != null) return false;
    if(this.day    != null) return false;
    if(this.hour   != null) return false;
    if(this.minute != null) return false;
    if(this.second != null) return false;
    return true;
};

function setSchedule(username, id, quoteurl, date)
{
    var message1 = '承りました。後でお伝えいたします。';
    var message2 = 'ご予定が入っております。';
    
    bot.post('statuses/update', {
	status: username + message1 + quoteurl,
	in_reply_to_status_id: id
    }, function(error, tweet, response) {
	//if(error) console.log('Error ' + error);
    });

    
    schedule.scheduleJob(date, function() {
	bot.post('statuses/update', {
	    status: username + message2 + quoteurl,
	    in_reply_to_status_id: id
	}, function(error, tweet, response){
	    //if(error) console.log('Error ' + error);
	});
    });    
}

// reply 'myrem'
function replySchedules(username, id)
{
    var rs = fs.ReadStream(logfile);
    var ri = rl.createInterface({'input': rs, 'output': {}});
    var message1 = '以下のご予定を存じております。\n';
    var message2 = 'ご予定は言付かっておりません。\n';
    var note = "";
    ri.on('line', function(line) {
	var logdata = line.trim().split(" ");
	if(logdata[1] == username && new Date(Number(logdata[2])) > new Date()){
	    note += logdata[3] + '\n';
	}
    }).on('close', function() {
	if(note != ""){
	    bot.post('statuses/update', {
		status: username + message1 + note  + new Date().toLocaleString(),
		in_reply_to_status_id: id
	    }, function(error, tweet, response){
		//if(error) console.log('Error ' + error);
	    });
	} else {
	    bot.post('statuses/update', {
		status: username + message2 + new Date().toLocaleString(),
		in_reply_to_status_id: id
	    }, function(error, tweet, response){
		//if(error) console.log('Error ' + error);
	    });
	}
    });
}

// cron
cron.schedule('*/90 * * * * *', function(){
    bot.get('statuses/mentions_timeline', {count: 200}, function(error, tweets, response){
	if(error) return;
	if(tweets === null) return;
	
	var maxTime = new Date(lastTime.getTime());
	var logs = '';

	// asynchro loops - check all gotten tweets
	async.each(tweets, function(data, callback){
	    var createdTime = new Date(data.created_at);

	    if (data.user.id_str === bot_id) ;
	    else if (!firstBoot && createdTime <= lastTime) ;
	    else {
		// main
		if(createdTime > maxTime) maxTime = new Date(createdTime.getTime());
		var japan = new JapDate(data);
		var other = new OthDate(data);
		if(japan.isNULL() && other.isNULL()) {
		    // reply set schedules
		    if(data.text.match(/myrem/) && createdTime > lastTime){
			var username = '@' + data.user.screen_name;
			replySchedules(username, data.id_str);
		    }
		} else {
		    var date = new Date(createdTime.getTime());
		    
		    if(other.year !== null && other.month === null){
			other.month = other.year; other.year = null;
		    }
		    if(other.minute === null && other.second !== null){
			other.minute = other.second; other.second = null;
		    }
		    date.setMinutes(0); date.setSeconds(0);
		    
		    if(other.year !== null) date.setYear(Number(other.year[0].match(/\d+/)));
		    else if(japan.year !== null) date.setYear(Number(japan.year[0].match(/\d+/)));
		    
		    if(other.month !== null) date.setMonth(Number(other.month[0].match(/\d+/))-1);		    
		    else if(japan.month !== null) date.setMonth(Number(japan.month[0].match(/\d+/))-1);
		    
		    if(other.day !== null) date.setDate(Number(other.day[0].match(/\d+/)));		    
		    else if(japan.day !== null) date.setDate(Number(japan.day[0].match(/\d+/)));
		    
		    if(other.hour !== null) date.setHours(Number(other.hour[0].match(/\d+/)));		    
		    else if(japan.hour !== null) date.setHours(Number(japan.hour[0].match(/\d+/)));
		    else if(other.day !== null || japan.day !== null) date.setHours(0);
		    
		    if(other.minute !== null) date.setMinutes(Number(other.minute[0].match(/\d+/)));
		    else if(japan.minute !== null) date.setMinutes(Number(japan.minute[0].match(/\d+/)));
		    else if(other.hour !== null || japan.hour !== null) date.setMinutes(0);
		    
		    if(other.second !== null) date.setSeconds(Number(other.second[0].match(/\d+/)));		    
		    else if(japan.second !== null) date.setSeconds(Number(japan.second[0].match(/\d+/)));	    
		    else if(other.minute !== null || japan.minute !== null) date.setSeconds(0);

		    if(date > new Date() && createdTime > lastTime){
			var username = '@' + data.user.screen_name;
			var quoteurl = 'https://twitter.com/' + data.user.screen_name + '/status/' + data.id_str;
			logs += createdTime.getTime() + ' ' + username + ' ' + date.getTime() + ' ' + quoteurl + '\n';
			setSchedule(username, data.id_str, quoteurl, date);
		    }
		}
	    }
	    callback();
	}, function(error) { 
	    if(error) {
		// console.log('Error: ' + error);
		return;
	    }
	});
	lastTime = new Date(maxTime.getTime());
	firstBoot = false;	
	fs.appendFile(logfile, logs, function(error) {
	    // if(error) console.log(error);
	});
    });
});
