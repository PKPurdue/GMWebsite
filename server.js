const request = require('request');
const express = require('express'); 
const app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 32483;

var users = [];
/*
	[socket] = {
		UserToken: userToken,
		Groups: groups
		UserId: userIdInGroupMe
	}
	
	[group] = {
		Name: groupName,
		Id: groupId,
		Members: members
	}
	
	[member] = {
		Name: memberName,
		UserId: memberId
	}
*/

app.use(express.static('public'));
app.get('/', function(req, res)
{
	res.sendFile(__dirname + '/public/index.html');
});

server.listen(port, function()
{
    console.log('listening on ' + port);
});


var beginningLink = "https://api.groupme.com/v3";

var commands = [];
commands.getMyUserId = function(token, callback)
{
	request.get(beginningLink + "/users/me?token=" + token, function(err, response, data)
	{
		var newData = JSON.parse(JSON.parse(JSON.stringify(data)));
		//console.log(JSON.stringify(newData));
		callback(newData.response); //newData);
	});
}

commands.getGroups = function(token, pageNum, callback)
{
	request.get(beginningLink + "/groups?token=" + token, {page: pageNum, per_page: 40}, function(err, response, data)
	{
		var newData = JSON.parse(JSON.parse(JSON.stringify(data)));
		callback(newData.response);
	});
}

commands.getDMs = function(token, callback)
{
	request.get(beginningLink + "/chats?token=" + token, {page: 1, per_page: 40}, function(err, response, data)
	{
		var newData = JSON.parse(JSON.parse(JSON.stringify(data)));
		callback(newData.response);
	});
}

commands.spamGroup = function(spamData, callback)
{
	var token = spamData.Token;
	var message = spamData.Message;
	var numTimes = spamData.NumberOfMessages;
	var groupId = spamData.GroupId;
	
	var messageCount = 0;
	var startTime = new Date().getTime();
	
	var i = 0;
	var aa = setInterval(function()
	{
		var formJson = 
		{
			"message": 
			{
				"source_guid": message + Math.floor(Math.random() * 10000),
				"text": message,
				"attachments": []
			}
		}
		var formData = JSON.stringify(formJson);
		var contentLength = formData.length;
		request({
				headers: {
					'Content-Length': contentLength,
					'Content-Type': 'application/json'
				},
				uri: beginningLink + "/groups/" + groupId + "/messages?token=" + token,
				body: formData,
				method: 'POST'
		}, function (err, res, body) {
			messageCount++;
			if (messageCount == numTimes)
			{
				var finishTime = new Date().getTime();
				console.log("Finished in " + (finishTime - startTime) + " ms");
				callback("Sent " + numTimes + " messages in " + (finishTime - startTime) + " ms");
			}
		});
		i++;
		if (i >= numTimes) { clearInterval(aa); }
	}, 25);
}

commands.kickUsersInGroup = function(spamData, callback)
{
	var token = spamData.Token;
	var groupId = spamData.GroupId;
	var groupName = spamData.GroupName;
	var people = spamData.Users;
	
	var kickLink = beginningLink + "/groups/" + groupId + "/members/";
	var startTime = new Date().getTime();
	var numKicked = 0;
	for (var i = 0; i < people.length; i++)
	{
		request.post(kickLink + people[i].UserId + "/remove?token=" + token, function(err, response, body) 
		{
			numKicked++;
			if (numKicked == people.length)
			{
				var finishTime = new Date().getTime();
				var totalTime = finishTime - startTime;
				callback("Kicked " + numKicked + " users from " + groupName + " in " + totalTime + " ms");
			}
		});
	}
}


io.on('connection', function(socket)
{
	console.log('a user connected');
	socket.id = Math.random();
	
	users[socket.id] = [];
	var user = users[socket.id];
	socket.on('disconnect', function()
	{
		delete[users[socket.id]];
	});
	
	socket.on('userToken', function(data)
	{
		user.UserToken = data.token;
		
		commands.getMyUserId(data.token, function(resp)
		{
			user.UserId = resp.user_id;
		});
		
		commands.getGroups(data.token, 1, function(resp)
		{
			if (resp != undefined && resp.length > 0)
			{
				if (user.groups != undefined && user.groups.length > 0)
				{
					for (var i = user.groups.length - 1; i > -1; i--)
					{
						delete[user.groups[i]];
					}
				}
				var groups = [];
				for (var i = 0; i < resp.length; i++)
				{
					var group = {};
					group.ClassName = "Group";
					group.Name = resp[i].name;
					group.GroupId = resp[i].group_id;
					group.Members = [];
					
					var groupMembers = resp[i].members;
					//console.log(groupMembers);
					for (var a = 0; a < groupMembers.length; a++)
					{
						if (groupMembers[a] != undefined && groupMembers[a].user_id != user.UserId && groupMembers[a].user_id != 18878236)
						{
							var member = {};
							member.Name = groupMembers[a].nickname || groupMembers[a].name || "Nil";
							member.UserId = groupMembers[a].id;
							group.Members.push(member);
						}
					}
					groups.push(group);
				}
				user.groups = groups;
			}
			commands.getDMs(data.token, function(resp)
			{
				if (resp != undefined && resp.length > 0)
				{
					if (user.groups == undefined) { user.groups = []; }
					for (var i = 0; i < resp.length; i++)
					{
						var group = {};
						group.ClassName = "DM";
						group.Name = resp[i].other_user.name;
						group.UserId = resp[i].other_user.id;
						user.groups.push(group);
					}
					//console.log(user.groups);
				}
				socket.emit('userTokenResponse', user.groups);
			});
		});
	});
	
	socket.on('spamMessageGroup', function(data)
	{
		commands.spamGroup(data, function(resp)
		{
			socket.emit('spamMessageGroupResponse', resp);
		});
	});
	
	socket.on('kickUsersInGroup', function(data)
	{
		commands.kickUsersInGroup(data, function(resp)
		{
			socket.emit('kickUsersInGroupResponse', resp);
		});
	});
});