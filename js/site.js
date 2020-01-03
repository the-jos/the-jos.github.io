// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Settings
var hostname = "farmer.cloudmqtt.com";
var port = 32017;
var inputs = document.getElementsByTagName('input');
var fieldset = document.getElementById('fields');
var submitButton = document.getElementById('submitbutton');
var resultSpan = document.getElementById('result');
var alarmstateSpan = document.getElementById('alarmstate');
var remainingtimeSpan = document.getElementById('remainingtime');
var countdowntime;
var requestCounter = 0;
var isArmed = false;
var options = {
    useSSL: true,
    userName: "roach",
    password: "roach",
    cleanSession: true,
    onSuccess: onConnect,
    onFailure: doFail
};
var countdownTimer = setInterval(timer, 1000);
var seconds = 0;

// Create a client instance
client = new Paho.MQTT.Client(hostname, Number(port), "clientId");

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// connect the client
client.connect(options);

submitButton.addEventListener("click", submitAlarm);
for (var i = 0; i < inputs.length; i++) {
    inputs[i].addEventListener("change", function () {
        resultSpan.innerText = "";
    });
}

function submitAlarm() {
    var alarmAanIsChecked = inputs[2].checked;
    if (alarmAanIsChecked) {
        // set alarm
        var alarmdate = inputs[0].valueAsDate;
        var hours = inputs[1].valueAsDate.getHours();
        var minutes = inputs[1].valueAsDate.getMinutes();
        alarmdate.setHours(hours - 1);
        // alarmdate.setUTCHours(hours.getUTCHours() - 1)
        alarmdate.setMinutes(minutes);
        alarmdate.setSeconds(00);

        var timeNow = new Date();
        var dif = alarmdate.getTime() - timeNow.getTime();
        var secondsFromT1ToT2 = dif / 1000;
        var secondsBetweenDates = Math.floor(secondsFromT1ToT2);
        if (secondsBetweenDates < 1) {
            resultSpan.innerText = "Ongeldige Tijd!";
        } else {
            console.log("----------");
            console.log("Alarm is set: " + alarmdate);
            console.log(secondsBetweenDates + " seconds left");
            var message = new Paho.MQTT.Message("<N," + secondsBetweenDates + ">");
            resultSpan.innerText = "Verzonden!";
            message.destinationName = "WebRoach";
            client.send(message);
            fieldset.setAttribute("disabled", "disabled");
            document.getElementById('loading').style.display = 'block';
        }
    } else {
        // cancel alarm
        var message = new Paho.MQTT.Message("<Z,0>");
        resultSpan.innerText = "Alarm geannuleerd!";
        message.destinationName = "WebRoach";
        client.send(message);
        fieldset.setAttribute("disabled", "disabled");
        document.getElementById('loading').style.display = 'block';
    }
}


// called when the client connects
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");
    client.subscribe("Roach");
    requestInfoFromRoach();
}

function requestInfoFromRoach() {
    var message = new Paho.MQTT.Message("<A,0>");
    message.destinationName = "WebRoach";
    client.send(message);
}

function doFail() {
    console.log("doFail");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:" + responseObject.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {
    console.log("onMessageArrived:" + message.payloadString);
    var payload = message.payloadString.match(/<(.*)>/);
    if (payload != null && payload.length > 0 && payload.pop().split(",").length === 2) {
        var extract = message.payloadString.match(/<(.*)>/).pop().split(",");
        isArmed = extract[0] > 0;
        countdowntime = parseInt(extract[1]);
        console.log("Armed: " + isArmed);
        console.log("Countdown: " + countdowntime);
        var alarmTime = new Date();
        if (isArmed) {
            seconds = countdowntime;
            countdownTimer = setInterval(timer, 1000);
            alarmTime.setSeconds(new Date().getSeconds() + countdowntime);
            console.log(alarmTime);
            alarmstateSpan.innerText = "Alarm staat AAN";
        } else {            
            alarmstateSpan.innerText = "Alarm staat UIT";
        }
        inputs[0].valueAsDate = alarmTime;
        inputs[1].value = String(alarmTime.getHours()).padStart(2, '0') +
            ":" +
            String(alarmTime.getMinutes()).padStart(2, '0');
        inputs[2].checked = isArmed;
        document.getElementById('loading').style.display = 'none';
        fieldset.removeAttribute("disabled");
        requestCounter = 0;
    } else if (requestCounter < 3) {
        requestInfoFromRoach();
    }
}

function timer() {
    if (isArmed) {
        var days = Math.floor(seconds / 24 / 60 / 60);
        var hoursLeft = Math.floor((seconds) - (days * 86400));
        var hours = Math.floor(hoursLeft / 3600);
        var minutesLeft = Math.floor((hoursLeft) - (hours * 3600));
        var minutes = Math.floor(minutesLeft / 60);
        var remainingSeconds = seconds % 60;

        function pad(n) {
            return (n < 10 ? "0" + n : n);
        }

        remainingtimeSpan.innerText = " (" + pad(days) + "d:" + pad(hours) + "u:" + pad(minutes) + "m:" + pad(remainingSeconds) + "s)";
        if (seconds == 0) {
            clearInterval(countdownTimer);
            remainingtimeSpan.innerText = "";
        } else {
            seconds--;
        }
    } else {
        clearInterval(countdownTimer);
        remainingtimeSpan.innerText = "";
    }
}
