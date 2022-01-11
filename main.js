const PROJECT_NUMBER = '282170708765';
const API_KEY = 'AIzaSyA3ec3t_lNdoGv_aqqqBNJCyZSfj1umBw4';
const WEB_CLIENT_KEY = '282170708765-m4s4vcfvqpkt4a5ean74q5q51jg05sa9.apps.googleusercontent.com';
const DESKTOP_CLIENT_KEY = '282170708765-m4s4vcfvqpkt4a5ean74q5q51jg05sa9.apps.googleusercontent.com';
const BASE_ENDPOINT = 'https://www.googleapis.com/calendar/v3';
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

// Enter an API key from the Google API Console:
//   https://console.developers.google.com/apis/credentials
var apiKey = 'AIzaSyA3ec3t_lNdoGv_aqqqBNJCyZSfj1umBw4';

// Enter the API Discovery Docs that describes the APIs you want to
// access. In this example, we are accessing the People API, so we load
// Discovery Doc found here: https://developers.google.com/people/api/rest/
var discoveryDocs = ["https://people.googleapis.com/$discovery/rest?version=v1", "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Enter a client ID for a web application from the Google API Console:
//   https://console.developers.google.com/apis/credentials?project=_
// In your API Console project, add a JavaScript origin that corresponds
//   to the domain where you will be running the script.
var clientId = '282170708765-m4s4vcfvqpkt4a5ean74q5q51jg05sa9.apps.googleusercontent.com';

// Enter one or more authorization scopes. Refer to the documentation for
// the API or https://developers.google.com/people/v1/how-tos/authorizing
// for details.
var scopes = 'profile';

var authorizeButton = document.getElementById('auth');
var signoutButton = document.getElementById('signout');

let signedIn = false;

// define week date boundaries
// initialize strating date information on Sunday
let startWeek = new Date();

// get current day of the week
const dayOfWeek = startWeek.getDay();

// subtract commensurate number of miliseconds from start
const MS_IN_DAY = 86400000;
const MS_IN_HOUR = MS_IN_DAY / 24;
const MS_IN_WEEK = MS_IN_DAY * 7;
startWeek = new Date(startWeek.valueOf() - MS_IN_DAY * (dayOfWeek));

// get year month and day of sunday
let year = startWeek.getFullYear();
let month = startWeek.getMonth() + 1;
let day = startWeek.getDate();

startWeek.setFullYear(year, month - 1, day);
startWeek.setHours(0, 0, 0, 0);
let endWeek = new Date(startWeek.valueOf() + (MS_IN_WEEK));

const signInStatus = document.getElementById('signInStatus');
let userCalendars = new Array();
let userColors;

// define class to handle each calendar
class Calendar {
    constructor(id, summary, colorId) {
        this.id = id;
        this.summary = summary;
        this.colorId = colorId;
        this.events = new Array();
    }

    addEvent(event) {
        this.events.push(event);
    }

    toString() {
        return `ID: ${this.id}, Summary: ${this.summary}, Events: ${this.events.toString()}`;
    }
}

function handleClientLoad() {
    // Load the API client and auth2 library
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: discoveryDocs,
        clientId: clientId,
        scope: SCOPES
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    });
}

/**
 * Uses binary search to identify the cell containing the start time of an event
 * 
 * @param {number} startTime 
 * @returns {HTMLElement} parent cell
 */
function identifyParentCell(startTime) {
    function searchForElement(lo, hi) {
        // check that we have not run out of cells
        if (lo >= hi) {
            throw (`startTime ${startTime} is not contained in any cells in the table`);
        }

        // identify midpoint of bounds
        const mid = Math.floor((lo + hi) / 2);

        // compare starttime of midpoint to input start time
        const midStartTime = parseInt(cellList[mid].dataset.datetime);
        const midEndTime = midStartTime + parseInt(cellList[mid].dataset.duration);
        if (midStartTime <= startTime && midEndTime > startTime) {
            // we found cell, return it
            return cellList[mid];
        } else if (midStartTime > startTime) {
            // look in lower half
            return searchForElement(lo, mid);
        } else {
            // look in upper half
            return searchForElement(mid + 1, hi);
        }
    }

    // search in entire table
    return searchForElement(0, cellList.length);
}

/**
 * Given an input calendar event, creates element for event and places it on
 * the calendar
 * 
 * @param {CalendarEvent} calEvent 
 * @param {Calendar} cal
 */
function generateEventBox(calEvent, cal) {
    // get duration of cell in ms
    const startDate = new Date(calEvent.start.dateTime);
    var msStart = startDate.getTime();
    var msEnd = new Date(calEvent.end.dateTime).getTime();

    // find cell where it should start
    let startCell;
    try {
        startCell = identifyParentCell(msStart);
    } catch (e) {
        return;
    }

    // compute offset from top
    const timeOffset = msStart - parseInt(startCell.dataset.datetime);

    // compute number of pixels offset represents
    const pixelOffset = timeOffset / MS_PER_PIXEL;

    // create box element
    const eventBox = document.createElement('div');
    eventBox.setAttribute('class', 'eventBox');
    eventBox.setAttribute('id', calEvent.id);

    // case on whether or not event has color
    if (!calEvent.colorId) {
        // get calendar's color id
        eventBox.style.backgroundColor = userColors.calendar[parseInt(cal.colorId)].background;
    } else {
        eventBox.style.backgroundColor = userColors.event[parseInt(calEvent.colorId)].background;
    }

    // append information
    const boldText = document.createElement('b');
    boldText.appendChild(document.createTextNode(calEvent.summary));
    eventBox.appendChild(boldText);
    eventBox.appendChild(document.createElement('br'));
    eventBox.appendChild(document.createTextNode(formatDate(new Date(msStart)) + ' - ' + formatDate(new Date(msEnd))));

    // assign padding
    const EVENT_BOX_PADDING = 4;

    eventBox.style.padding = `${EVENT_BOX_PADDING}px`;
    eventBox.style.top = `${parseInt(startCell.offsetTop) + pixelOffset}px`;
    eventBox.style.left = `${parseInt(startCell.offsetLeft)}px`;
    eventBox.style.width = `${parseInt((startCell.offsetWidth * 0.9) - (EVENT_BOX_PADDING * 2))}px`;
    eventBox.style.height = `${(((msEnd - msStart) / MS_PER_PIXEL) * 0.9) - (EVENT_BOX_PADDING * 2)}px`;

    // add enter and leave changes
    eventBox.addEventListener('mouseenter', (ev) => {
        // expand to full content
        ev.target.style.height = 'auto';
        ev.target.style.zIndex = '5';
    });
    eventBox.addEventListener('mouseleave', (ev) => {
        ev.target.style.height = `${(((msEnd - msStart) / MS_PER_PIXEL) * 0.9) - (EVENT_BOX_PADDING * 2)}px`;
        ev.target.style.zIndex = '1';
    })

    document.getElementById('calendarContainer').appendChild(eventBox);
}

/**
 * Reacts to user checking or unchecking a text box
 * 
 * @param {Event} ev 
 */
function onBoxTick(ev) {
    // get corresponding calendar
    const cal = userCalendars.find(cal => {
        return cal.id == ev.target.id;
    })

    // case on whether or not box is ticked
    if (ev.target.checked) {
        // create all boxes
        cal.events.forEach(ev => {
            generateEventBox(ev, cal);
        });
    } else {
        // delete all boxes
        cal.events.forEach(ev => {
            // delete current box
            try {
                const currBox = document.getElementById(ev.id);
                document.getElementById('calendarContainer').removeChild(currBox);
            } catch (e) {
                // no event there!
            }

        });
    }


}

/**
 * Takes passed in list of calendars and creates checkbox for each calendar
 * 
 * @param {Array<Calendar>} calendarList 
 */
function drawCheckBoxes(calendarList) {
    // identify checkbox container
    const container = document.getElementById('rightOut');

    // iterate over list
    calendarList.forEach(currCal => {
        // create checkbox and wrapper for current calendar
        const wrapper = document.createElement('div');
        const checkBox = document.createElement('input');
        checkBox.setAttribute('type', 'checkbox');
        checkBox.setAttribute('id', currCal.id);
        checkBox.addEventListener('change', onBoxTick);
        wrapper.appendChild(checkBox);
        wrapper.appendChild(document.createTextNode(' ' + currCal.summary));

        container.appendChild(wrapper);
    });


}

/**
 * Body of methods to call upon a user being signed in
 */
function onSignIn() {
    // get all user calendars
    let eventPromises = new Array();
    getCalendars().then(calendarList => {
        // iterate over all calendars
        calendarList.forEach(currCal => {
            // create calendar object
            userCalendars.push(new Calendar(currCal.id, currCal.summary, currCal.colorId));

            // create a promise for each calendar
            eventPromises.push(getEvents(currCal.id, startWeek, endWeek));
        });
    }).then(() => {
        Promise.allSettled(eventPromises).then(resultArrays => {
            // iterate over result arrays
            for (let i = 0; i < resultArrays.length; i++) {
                // get current calendar and its events
                const cal = userCalendars[i];
                const events = resultArrays[i].value;

                // add all events to calendar
                events.forEach(ev => {
                    cal.addEvent(ev);
                });
            }

            // return result
            return userCalendars;
        }).then(calendarList => {
            drawCheckBoxes(calendarList);
        });
    });

    gapi.client.calendar.colors.get({}).then(response => {
        userColors = response.result;
    });
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        signedIn = true;
        signInStatus.innerText = "Signed in!"
        // authorizeButton.style.display = 'none';
        // signoutButton.style.display = 'block';
        onSignIn();
    } else {
        // authorizeButton.style.display = 'block';
        // signoutButton.style.display = 'none';
        signInStatus.innerHTML = "Not signed in :("
        signedIn = false;
    }
}

function handleAuthClick(event) {
    if (!signedIn) {
        gapi.auth2.getAuthInstance().signIn();
    }
}

function handleSignoutClick(event) {
    if (signedIn) {
        gapi.auth2.getAuthInstance().signOut();
    }

}

function addText(message) {
    var label = document.getElementById('eventsList');
    var textContent = document.createTextNode(message + '\n');
    label.appendChild(textContent);
}

/**
 * Configures passed in element to be occupied
 * 
 * @param {HTMLElement} elt
 */
function markAsOccupied(elt) {
    elt.style.backgroundColor = 'gray';
    elt.style.borderTopWidth = '0px';
    elt.style.borderBottomWidth = '0px';
}

/**
 * 
 * Sets the background color to gray for events in your calendar.
 * 
 * @param {Integer} start 
 * @param {Integer} end 
 */
function setCalendarBusy(start, end) {
    // while (start < end) {
    //     var elt = document.querySelector("[data-datetime = '" + start + "']");
    //     if (elt != null) {
    //         elt.style.backgroundColor = 'gray';
    //         elt.style.borderTopWidth = '0px';
    //         elt.style.borderBottomWidth = '0px';
    //     }

    //     start = start + 3600000;
    // }

    // iterate over all cells
    cellList.forEach(el => {
        // check if cell start time falls within window
        const startTime = parseInt(el.dataset.datetime);
        if (startTime >= start && startTime < end) {
            markAsOccupied(el);
        }
    })
}

/**
 * @returns list of calendar objects in user's list
 */
function getCalendars() {
    return new Promise((resolve, reject) => {
        // get list of calendars
        gapi.client.calendar.calendarList.list({}).then(response => {
            resolve(response.result.items);
        });
    });
}

/**
 * 
 * @param {string} calendarId 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {number} maxResults 
 * @returns {Promise} promise containing all events within parameters contained
 *                    in the input calendar
 */
function getEvents(calendarId, startDate, endDate, maxResults = 50) {
    return new Promise((resolve, reject) => {
        gapi.client.calendar.events.list({
            'calendarId': calendarId,
            'timeMin': (startDate).toISOString(),
            'timeMax': (endDate).toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': maxResults,
            'orderBy': 'startTime'
        }).then(response => {
            resolve(response.result.items);
        })
    })

}

/**
 * Iterates through events in the user's calendars ranging between the start
 * and end dates
 * 
 * @param {Date} startDate 
 * @param {Date} endDate 
 */
function listUpcomingEvents(startDate, endDate) {
    gapi.client.calendar.calendarList.list({
        // No parameters yay
    }).then(response => {
        // get calendar list
        const calendarList = response.result.items;
        calendarList.forEach(currCal => {
            gapi.client.calendar.events.list({
                'calendarId': currCal.id,
                'timeMin': (startDate).toISOString(),
                'timeMax': (endDate).toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 10,
                'orderBy': 'startTime'
            }).then(function (response) {
                var events = response.result.items;
                // addText('Upcoming events:');

                if (events.length > 0) {
                    for (i = 0; i < events.length; i++) {
                        var event = events[i];
                        var when = event.start.dateTime;
                        if (!when) {
                            when = event.start.date;
                            // var date = new Date(when).toLocaleString('en-US', {
                            //     timeZone: 'UTC',
                            //     day: 'numeric',
                            //     month: 'numeric',
                            //     year: 'numeric'
                            // });

                            // addText(event.summary + ' (' + date + ')');
                        } else {
                            // var startDate = new Date(when).toLocaleString('en-US', {
                            //     day: 'numeric',
                            //     month: 'numeric',
                            //     year: 'numeric',
                            //     hour: 'numeric',
                            //     minute: 'numeric',
                            //     hour12: true
                            // });

                            var msStart = new Date(event.start.dateTime).getTime();
                            var msEnd = new Date(event.end.dateTime).getTime();
                            setCalendarBusy(msStart, msEnd);

                            // var endDate = new Date(event.end.dateTime).toLocaleString('en-US', {
                            //     hour: 'numeric',
                            //     minute: 'numeric',
                            //     hour12: true
                            // });

                            // addText(event.summary + ' (' + startDate + ' to ' + endDate + ')');
                        }
                    }
                } else {
                    // addText('No upcoming events found.');
                }
            });
        })
    })

}