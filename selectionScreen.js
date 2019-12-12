$(document).ready(async function () {
    let listName = decodeURI(window.location.hash.substring(1));
    const publicRoot = new axios.create({
        baseURL: "http://localhost:3000/public"
    });

    async function getList() {
        return await publicRoot.get("/listsToSort")
    }

    let lists = await getList();
    let list = lists.data.result.find(function (list) {
        return list.name === listName;
    });

    if (localStorage.getItem("username") !== null) {
        replaceLoginSignup();
    }

    $("#criteriaText").html(list.name + ": " + list.criteria);

    $("body").on("click", "#usernameLink", function() {
        window.location.href = "/RateIt/login.html"
    });

    let array = list.items.map(function (item) { return item; });

    let sortedList = await startMergeSort(randomizeList(array), array.length);
    sortedList = sortedList.reverse();

    await uploadGlobalRatings(list, sortedList, lists);
});

function replaceLoginSignup() {
    $("#loginButtons").empty();
    $("#loginButtons").append("<p class='navbar-brand m-0'>Logged in as: <span id='usernameLink'>" + localStorage.getItem("username") + "</span></p>");
}

async function startMergeSort(items, n, lists) {
    let width, i;

    for (width = 1; width < n; width = width * 2) {
        for (i = 0; i < n; i = i + 2 * width) {
            await new Promise(async (resolve) => {

                await mergeSort(items, i, Math.min(i + width, n), Math.min(i + 2 * width, n));

                async function mergeSort(items, left, right, end) {
                    let n = left, m = right, currentSort = [], j;

                    for (j = left; j < end; j++) {

                        if (n < right && (m >= end || await wasRightClicked())) {
                            currentSort.push(items[n]);
                            n++;
                        }
                        else {
                            currentSort.push(items[m]);
                            m++;
                        }

                        async function wasRightClicked() {
                            let promiseName = await new Promise((resolve) => {

                                isRightGreater(items[n], items[m]);

                                function isRightGreater(leftItem, rightItem) {

                                    if (n === m) {
                                        resolve(true);
                                    }

                                    if (leftItem === undefined || rightItem === undefined) {
                                        resolve(false);
                                    }

                                    $("#leftSideText").html(leftItem.name);
                                    $("#leftSideImage").attr('src', leftItem.img);
                                    $("#rightSideText").html(rightItem.name);
                                    $("#rightSideImage").attr('src', rightItem.img)

                                    $(document).on('keyup', function (e) {
                                        if (e.which === 37) { // left
                                            $("#leftSideChoice").toggleClass("isClicked");
                                            $("#rightSideChoice").toggleClass("isNotClicked");
                                            setTimeout(function () {
                                                $("#leftSideChoice").toggleClass("isClicked");
                                                $("#rightSideChoice").toggleClass("isNotClicked");
                                                resolve(false);
                                            }, 300);
                                            $("#rightSideChoice").off();
                                            $("#leftSideChoice").off();
                                            $(document).off("keyup");
                                        } else if (e.which === 39) { // right
                                            $("#leftSideChoice").toggleClass("isNotClicked");
                                            $("#rightSideChoice").toggleClass("isClicked");
                                            setTimeout(function () {
                                                $("#leftSideChoice").toggleClass("isNotClicked");
                                                $("#rightSideChoice").toggleClass("isClicked");
                                                resolve(true);
                                            }, 300);
                                            $("#rightSideChoice").off();
                                            $("#leftSideChoice").off();
                                            $(document).off("keyup");
                                        }

                                        e.preventDefault();
                                    });

                                    $("#leftSideChoice").on("click", function (e) {
                                        $("#leftSideChoice").toggleClass("isClicked");
                                        $("#rightSideChoice").toggleClass("isNotClicked");
                                        setTimeout(function () {
                                            $("#leftSideChoice").toggleClass("isClicked");
                                            $("#rightSideChoice").toggleClass("isNotClicked");
                                            resolve(false);
                                        }, 300);
                                        $("#rightSideChoice").off();
                                        $("#leftSideChoice").off();
                                        $(document).off("keyup");
                                    });

                                    $("#rightSideChoice").on("click", function (e) {
                                        $("#leftSideChoice").toggleClass("isNotClicked");
                                        $("#rightSideChoice").toggleClass("isClicked");
                                        setTimeout(function () {
                                            $("#leftSideChoice").toggleClass("isNotClicked");
                                            $("#rightSideChoice").toggleClass("isClicked");
                                            resolve(true);
                                        }, 300);
                                        $("#rightSideChoice").off();
                                        $("#leftSideChoice").off();
                                        $(document).off("keyup");
                                    });

                                }
                            });
                            return promiseName;
                        }


                    }

                    currentSort.map(function (item, i) {
                        items[left + i] = item;
                    });

                }

                resolve();

            });

        }
    }
    return items;
}

// Uses Fisher-Yates shuffle
function randomizeList(list) {
    let currentInd = list.length;
    let tempVal;
    let randomInd;

    while (0 !== currentInd) {
        randomInd = Math.floor(Math.random() * currentInd);
        currentInd--;

        tempVal = list[currentInd];
        list[currentInd] = list[randomInd];
        list[randomInd] = tempVal;
    }

    return list;
}

async function uploadGlobalRatings(list, sortedList, allPublicLists) {

    let userData = await getStatus();

    try {
        const globalData = await axios({
            headers: {
                Authorization: "Bearer " + localStorage.getItem("jwt"),
            },
            method: 'GET',
            url: 'http://localhost:3000/private/globalListRatings/' + list.name,
        })

        let completedUsernames = globalData.data.result.individualRatings.map(function (object) {
            return object.username;
        });

        let newObject = globalData.data.result;

        // If individual ratings already has the logged in user
        if (completedUsernames.includes(userData.data.user.name)) {
            console.log("done");

            // returns rankings of correct user
            let previousRanking = globalData.data.result.individualRatings.find(function (userRanking) {
                return userRanking.username === userData.data.user.name;
            }).rankings;

            let itemsListWithoutUser = [];

            // remove previous rankings
            for (let i = 0; i < previousRanking.length; i++) {
                let correctItem = newObject.items.find(function (globalRating) {
                    return globalRating.name === previousRanking[i].name;
                });
                correctItem.totalRating -= previousRanking[i].rating;
                itemsListWithoutUser.push(correctItem);
            }

            let itemsListWithUser = [];

            // add back new rankings
            for (let i = 0; i < sortedList.length; i++) {
                let correctItem = itemsListWithoutUser.find(function (item) {
                    return item.name === sortedList[i].name;
                });
                correctItem.totalRating += i + 1;
                correctItem.averageRating = correctItem.totalRating / newObject.timesUsed;
                itemsListWithUser.push(correctItem);
            }

            newObject.items = itemsListWithUser;

            let userItems = [];

            for (let i = 0; i < sortedList.length; i++) {
                let jsonItemText =
                    '{' +
                    '"name": "' + sortedList[i].name + '", ' +
                    '"rating": ' + (i + 1) +
                    '}';
                userItems.push(JSON.parse(jsonItemText));
            }

            let userSubmissionData =
                JSON.parse('{' +
                    '"username": "' + userData.data.user.name + '", ' +
                    '"birthdate": "' + userData.data.user.data.birthdate + '", ' +
                    '"gender": "' + userData.data.user.data.gender +
                    '"}');

            userSubmissionData.rankings = userItems;

            newObject.individualRatings = newObject.individualRatings.filter(function (userObject) {
                return userObject.username !== userData.data.user.name;
            });

            newObject.individualRatings.push(userSubmissionData);

            let dataObject = JSON.parse("{}");
            dataObject.data = newObject;

            let jsonObject = JSON.parse('{}');
            jsonObject.data = JSON.parse(JSON.stringify(sortedList));

            const response = await axios({
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("jwt"),
                },
                method: 'POST',
                url: 'http://localhost:3000/user/' + localStorage.getItem("username") + '/responses/' + list.name,
                data: jsonObject
            });

            let postResponse = await axios({
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("jwt"),
                },
                data: dataObject,
                method: 'POST',
                url: 'http://localhost:3000/private/globalListRatings/' + list.name,
            });

            window.location.href = "index.html#" + list.name;

        }
        // if user hasn't submitted before
        else {

            newObject.timesUsed++;
            for (let i = 0; i < sortedList.length; i++) {
                let correctItem = newObject.items.find(function (item) {
                    return item.name === sortedList[i].name;
                });
                correctItem.totalRating += i + 1;
                correctItem.averageRating = correctItem.totalRating / newObject.timesUsed;
            }

            let userItems = [];

            for (let i = 0; i < sortedList.length; i++) {
                let jsonItemText =
                    '{' +
                    '"name": "' + sortedList[i].name + '", ' +
                    '"rating": ' + (i + 1) +
                    '}';
                userItems.push(JSON.parse(jsonItemText));
            }

            let userSubmissionData =
                JSON.parse('{' +
                    '"username": "' + userData.data.user.name + '", ' +
                    '"birthdate": "' + userData.data.user.data.birthdate + '", ' +
                    '"gender": "' + userData.data.user.data.gender +
                    '"}');

            userSubmissionData.rankings = userItems;

            newObject.individualRatings.push(userSubmissionData);

            let newPublicList = allPublicLists.data.result.slice();

            let correctPublicList = newPublicList.find(function (publicList) {
                return publicList.name === list.name;
            });

            let indexOfCorrectPublicList = newPublicList.indexOf(correctPublicList)

            newPublicList[indexOfCorrectPublicList].timesRated++;

            let newPublicJsonObject = JSON.parse('{}');
            newPublicJsonObject.data = JSON.parse(JSON.stringify(newPublicList));

            const replacePublicLists = await axios({
                method: 'POST',
                url: 'http://localhost:3000/public/listsToSort',
                data: newPublicJsonObject
            });

            globalData.data = newObject;

            let jsonObject = JSON.parse('{}');
            jsonObject.data = JSON.parse(JSON.stringify(sortedList));

            const response = await axios({
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("jwt"),
                },
                method: 'POST',
                url: 'http://localhost:3000/user/' + localStorage.getItem("username") + '/responses/' + list.name,
                data: jsonObject
            });

            const postResponse = await axios({
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("jwt"),
                },
                data: globalData,
                method: 'POST',
                url: 'http://localhost:3000/private/globalListRatings/' + list.name,
            });

            window.location.href = "index.html#" + list.name;
        }
    }

    // If the list isn't in the backend yet
    catch (error) {
        if (error.message.includes("404")) {
            let categoryName = list.name;

            let itemsArray = [];

            for (let i = 0; i < list.items.length; i++) {
                let jsonItems =
                    '{' +
                    '"name": "' + list.items[i].name + '", ' +
                    '"totalRating": 0, ' +
                    '"averageRating": 0' +
                    '}';
                itemsArray.push(JSON.parse(jsonItems));
            }

            let newCategory =
                '{"data": {' +
                '"timesUsed": 0,' +
                '"individualRatings": []' +
                '}}';

            let newCategoryJSON = JSON.parse(newCategory);
            newCategoryJSON.data.items = itemsArray;

            const postResponse = await axios({
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("jwt"),
                },
                data: newCategoryJSON,
                method: 'POST',
                type: 'merge',
                url: 'http://localhost:3000/private/globalListRatings/' + categoryName,
            });

            // restart method now that it has been added to the backend
            uploadGlobalRatings(list, sortedList, allPublicLists);
        }
    }
}

async function getStatus() {
    let response;

    try {
        response = await axios({
            headers: {
                Authorization: "Bearer " + localStorage.getItem("jwt"),
            },
            method: 'GET',
            url: 'http://localhost:3000/account/status',
        });
    } catch (e) {
        response = e.response.status;
    }

    return response;
}