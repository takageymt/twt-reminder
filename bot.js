var twitter = require('twitter');
var schedule = require('node-schedule');
var cron = require('node-cron');
var async = require('async');
var fs = require('fs');
var rl = require('readline');
var logfile = 'schedule.log';

var bot = new twitter({
    consumer_key:'CONSUMER_KEY',
    consumer_secret:'CONSUMER_SECRET',
    access_token_key:'ACCESS_TOKEN_KEY',
    access_token_secret:'ACCESS_TOKEN_SECRET'
});
var bot_id = 'BOT_ID';
var bot_name = '@BOT_NAME';
var lastTime = new Date();
var firstBoot = true;

cron.schedule('*/65 * * * * *', function(){
    bot.get('statuses/mentions_timeline', {count: 200}, function(error, tweets, response){
	if(error){
	    //console.log('Error ' + error);
	    return;
	}
	if(tweets === null) return;
	var maxTime = new Date(lastTime.getTime());
	var logs = '';
	async.each(tweets, function(data, callback){
	    var createdTime = new Date(data.created_at);
	    if (data.user.id_str === bot_id) ;
	    if (!firstBoot && createdTime <= lastTime) ;
	    else {
		if(createdTime > maxTime) maxTime = new Date(createdTime.getTime());
		var date = new Date(createdTime.getTime());
		var nenn = data.text.match(/\d+年/);
		var gatsu = data.text.match(/\d+月/);
		var nichi = data.text.match(/\d+日/);
		var ji = data.text.match(/\d+時/);
		var hun = data.text.match(/\d+分/);
		var byou = data.text.match(/\d+秒/);
		var year = data.text.match(/\d+[\-\/]/); 
		var month = data.text.match(/[\-\/]\d+[\-\/]/);
		var day = data.text.match(/[\-\/]\d+(?!([\-\/]|\d))/);
		var hour = data.text.match(/\d+:/);
		var minute = data.text.match(/:\d+:/);
		var second = data.text.match(/:\d+(?!(:|\d))/);
		if(nenn === null &&
		   gatsu === null &&
		   nichi === null &&
		   ji === null &&
		   hun === null &&
		   byou === null && 
		   year === null &&
		   month === null &&
		   day === null &&
		   hour === null && 
		   minute === null &&
		   second === null) {
		    if(data.text.match(/myremi/) && createdTime > lastTime){
			var username = '@' + data.user.screen_name;			
			var rs = fs.ReadStream(logfile);
			var ri = rl.createInterface({'input': rs, 'output': {}});
			var note = "";
			ri.on('line', function(line) {
			    var logdata = line.trim().split(" ");
			    if(logdata[1] == username && new Date(Number(logdata[2])) > new Date()){
				note += logdata[3] + '\n';
			    }
			}).on('close', function() {
			    if(note != ""){
				bot.post('statuses/update', {status: username + ' I will notify later.\n' + note  + new Date().toLocaleString(), in_reply_to_status_id: data.id_str}, function(error, tweet, response){
				    //if(error) console.log('Error ' + error);
				});
			    } else {
				bot.post('statuses/update', {status: username + ' You do not have any plans.' + new Date().toLocaleString(), in_reply_to_status_id: data.id_str}, function(error, tweet, response){
				    //if(error) console.log('Error ' + error);
				});
			    }
			});
			
		    }
		} else {
		    if(year !== null && month === null){ month = year; year = null; }
		    if(minute === null && second !== null){ minute = second; second = null; }
		    date.setMinutes(0); date.setSeconds(0);
		    if(nenn !== null) date.setYear(Number(nenn[0].match(/\d+/)));
		    else if(year !== null) date.setYear(Number(year[0].match(/\d+/)));
		    if(gatsu !== null) date.setMonth(Number(gatsu[0].match(/\d+/))-1);
		    else if(month !== null) date.setMonth(Number(month[0].match(/\d+/))-1);
		    if(nichi !== null) date.setDate(Number(nichi[0].match(/\d+/)));
		    else if(day !== null) date.setDate(Number(day[0].match(/\d+/)));
		    if(ji !== null) date.setHours(Number(ji[0].match(/\d+/)));
		    else if(hour  !== null) date.setHours(Number(hour[0].match(/\d+/)));
		    else if(nichi !== null || day !== null) date.setHours(0);	    
		    if(hun !== null) date.setMinutes(Number(hun[0].match(/\d+/)));
		    else if(minute !== null) date.setMinutes(Number(minute[0].match(/\d+/)));
		    else if(ji !== null || hour !== null) date.setMinutes(0);
		    if(byou !== null) date.setSeconds(Number(byou[0].match(/\d+/)));	    
		    else if(second !== null) date.setSeconds(Number(second[0].match(/\d+/)));
		    else if(hun !== null || minute !== null) date.setSeconds(0);

		    if(date > new Date()){
			//console.log(data.text);
			var username = '@' + data.user.screen_name;
			var quoteurl = 'https://twitter.com/' + data.user.screen_name + '/status/' + data.id_str;
			logs += createdTime.getTime() + ' ' + username + ' ' + date.getTime() + ' ' + quoteurl + '\n';
			if(createdTime > lastTime){
			    bot.post('statuses/update', {status: username + ' I will notify later. ' + quoteurl, in_reply_to_status_id: data.id_str}, function(error, tweet, response) {
				//if(error) console.log('Error ' + error);
			    });
			}                    
			
			schedule.scheduleJob(date, function () {
			    bot.post('statuses/update', {status: username + ' You have plans. ' + quoteurl, in_reply_to_status_id: data.id_str}, function(error, tweet, response){
				//if(error) console.log('Error ' + error);
			    });
			});
		    }
		}
	    }
	    callback();
	}, function(error) { 
	    if(error) {
		//console.log('Error: ' + error);
		return;
	    }
	});
	lastTime = new Date(maxTime.getTime());
	firstBoot = false;	
	fs.appendFile(logfile, logs, function(error){
	    //if(error) console.log(error);
	});
    });
});
