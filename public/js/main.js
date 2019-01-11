var socket = io();
var socket_id;
var groups = undefined;
var userToken = "";
var lastFinishClick = 0;

socket.on('userTokenResponse', function(data)
{
	console.log(JSON.stringify(data));
	groups = data;
	var groupsSelection = $("#userGroups")[0];
	for (var i = 0; i < groups.length; i++)
	{
		var group = groups[i];
		
		var clon = groupsSelection.children[0].cloneNode(true);
		clon.style.display = "block";
		clon.value = (group.ClassName == "DM" && group.UserId || group.GroupId);
		clon.setAttribute("ClassName", group.ClassName);
		clon.innerHTML = (group.ClassName == "DM" && "(DM) " || "") + group.Name;
		groupsSelection.appendChild(clon);
	}
	$("#accessTokenFrame")[0].style.display = "none";
	$("#groupFrame")[0].style.display = "block";
});

socket.on('spamMessageGroupResponse', function(data)
{
	alert("Success! " + data);
	window.location.reload();
});

socket.on('kickUsersInGroupResponse', function(data)
{
	alert("Success! " + data);
	window.location.reload();
});

function tokenInputted()
{
	var tokenInput = $("#tokenInput")[0];
	var tokenButton = $("#tokenButton")[0];
	if (tokenInput.value.length > 15)
	{
		tokenButton.style.display = "block";
		$("#AccessTokenImage")[0].style.display = "none";
	}
	else
	{
		tokenButton.style.display = "none";
		$("#AccessTokenImage")[0].style.display = "";
	}
}

function submitToken()
{
	var tokenInput = $("#tokenInput")[0];
	userToken = tokenInput.value;
	socket.emit('userToken', {token: tokenInput.value});
}

function commandSelected()
{
	$("#groupSelectDiv")[0].style.display = "";
	
	$("#userSelectDiv")[0].style.display = "none";
	$("#messageDiv")[0].style.display = "none";
	$("#messageCountDiv")[0].style.display = "none";
	$("#submitButton")[0].style.display = "none";
	
	var groupElement = $("#userGroups")[0];
	var groupName = groupElement[groupElement.selectedIndex].innerHTML;
	
	if (groupName != "Choose a Group") { groupSelected(); }
}

function addMemberElements()
{
	var userSelect = $("#selectUsers")[0];
	for (var i = userSelect.children.length - 1; i > 1; i--)
	{
		userSelect.children[i].remove();
	}
	var group = undefined;
	var groupElement = $("#userGroups")[0];
	var groupName = groupElement[groupElement.selectedIndex].innerHTML;
	
	for (var i = 0; i < groups.length; i++)
	{
		if (groups[i].Name == groupName)
		{
			group = groups[i];
			//console.log(group);
			break;
		}
	}
	
	var groupMembers = group.Members;
	for (var i = 0; i < groupMembers.length; i++)
	{
		var clon = userSelect.children[0].cloneNode(true);
		clon.value = groupMembers[i].UserId;
		clon.innerHTML = groupMembers[i].Name;
		clon.style.display = "";
		userSelect.appendChild(clon);
	}
}

function groupSelected()
{
	var commandElement = $("#commandInputSelect")[0];
	var command = commandElement[commandElement.selectedIndex].innerHTML;
	var userSelect = $("#userSelectDiv")[0];
	var messageChoose = $("#messageDiv")[0];
	var messageCount = $("#messageCountDiv")[0];
	$("#submitButton")[0].style.display = "";
	
	if (command == "Spam Group")
	{
		userSelect.style.display = "none";
		messageChoose.style.display = "";
		messageCount.style.display = "";
	}
	else if (command == "Kick User(s) in Group")
	{
		addMemberElements();
		userSelect.style.display = "";
		messageChoose.style.display = "none";
		messageCount.style.display = "none";
	}
	else
	{
		console.log(command);
	}
}

function sanitizeNumber()
{
	var numberInput = $("#spamMessageCount")[0];
	var parsed = parseInt(numberInput.value);
	if (parsed == undefined || parsed < 1) { parsed = 1; }
	if (parsed > numberInput.max) { parsed = Math.floor(parsed / 10); }
	if (parsed == undefined || parsed < 1) { parsed = 1; }
	
	numberInput.value = parsed;
}

function finish()
{
	if ((new Date().getTime() - lastFinishClick) < 10000)
	{
		return;
	}
	lastFinishClick = new Date().getTime();
	var commandElement = $("#commandInputSelect")[0];
	var command = commandElement[commandElement.selectedIndex].innerHTML;
	
	if (command == "Spam Group")
	{
		var groupElement = $("#userGroups")[0];
		var selectedElement = groupElement[groupElement.selectedIndex]
		var groupName = selectedElement.innerHTML;
		var groupId = selectedElement.value;
		
		var message = $("#spamMessageInput")[0].value;
		var numTimes = parseInt($("#spamMessageCount")[0].value) || "1";
		
		var socketData = {};
		socketData.Message = message;
		socketData.NumberOfMessages = numTimes;
		socketData.GroupId = groupId;
		socketData.Token = userToken;
		
		socket.emit("spamMessageGroup", socketData);
	}
	else if (command == "Kick User(s) in Group")
	{
		var groupElement = $("#userGroups")[0];
		var selectedElement = groupElement[groupElement.selectedIndex]
		var groupName = selectedElement.innerHTML;
		var groupId = selectedElement.value;
		
		var selected = $("#selectUsers")[0];
		var options = selected.options;
		var people = [];
		var allUsers = false;
		for (var i = 0; i < options.length; i++)
		{
			if (options[i].selected && options[i].innerHTML == "All Users")
			{
				allUsers = true;
				break;
			}
		}
		
		for (var i = 0; i < options.length; i++)
		{
			if ((options[i].selected || allUsers == true) && options[i].innerHTML != "All Users")
			{
				var person = {};
				person.Name = options[i].innerHTML;
				person.UserId = options[i].value;
				people.push(person);
			}
		}
		
		var socketData = {};
		socketData.Token = userToken;
		socketData.GroupId = groupId;
		socketData.GroupName = groupName;
		socketData.Users = people;
		
		socket.emit("kickUsersInGroup", socketData);
	}
}
