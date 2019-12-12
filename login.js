$(document).ready(async function () {
    let profile = await getStatus();

    if (localStorage.getItem("username") !== null) {
        replaceLoginSignup();
    }

    setProfileDetails(profile);

    const profileListsDone = await axios({
        headers: {
            Authorization: "Bearer " + localStorage.getItem("jwt"),
        },
        method: 'GET',
        url: 'http://localhost:3000/user/' + localStorage.getItem("username") + '/responses',
    });

    const allPublicLists = await axios({
        method: 'GET',
        url: 'http://localhost:3000/public/listsToSort',
    });

    $("#deleteProfileButton").on("click", async function () {
        const getUserJson = await axios({
            headers: {
                Authorization: "Bearer " + localStorage.getItem("jwt"),
            },
            method: 'GET',
            url: 'http://localhost:3000/user/' + localStorage.getItem("username"),
        });
        let sortedUserResponses = getUserJson.data.result.responses;

        for (responseTitle in getUserJson.data.result.responses) {

            const deleteUserJson = await axios({
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("jwt"),
                },
                method: 'DELETE',
                url: 'http://localhost:3000/user/' + localStorage.getItem("username") + '/responses/' + responseTitle,
            });

            for(let i = 0; i < allPublicLists.data.result.length; i++) {
                if (allPublicLists.data.result[i].name === responseTitle) {
                    allPublicLists.data.result[i].timesRated -= 1;
                }
            }

            const postNewPublicList = await axios({
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("jwt"),
                },
                method: 'GET',
                url: 'http://localhost:3000/user/' + localStorage.getItem("username"),
            });

                const getDonePrivateResponses = await axios({
                    headers: {
                        Authorization: "Bearer " + localStorage.getItem("jwt"),
                    },
                    method: 'GET',
                    url: 'http://localhost:3000/private/globalListRatings/' + responseTitle,
                });

                let donePrivateResponse = getDonePrivateResponses.data.result;
                let sortedUserResponse = sortedUserResponses[responseTitle];

                donePrivateResponse.timesUsed--;

                for(let i = 0; i < sortedUserResponse.length; i++) {
                    for(let j = 0; j < donePrivateResponse.items.length; j++) {
                        if (donePrivateResponse.items[j].name === sortedUserResponse[i].name) {
                            donePrivateResponse.items[j].totalRating -= (i + 1);

                            if (donePrivateResponse.items[j].totalRating === 0) {
                                donePrivateResponse.items[j].averageRating = 0;
                            } else {
                                donePrivateResponse.items[j].averageRating = donePrivateResponse.items[j].totalRating/donePrivateResponse.timesUsed;
                            }
                        }
                    }
                }

                let individualResponseToRemove = donePrivateResponse.individualRatings.find(function(individualResponse) {
                    return individualResponse.username === localStorage.getItem("username");
                });

                donePrivateResponse.individualRatings.splice(donePrivateResponse.individualRatings.indexOf(individualResponseToRemove), 1);

                getDonePrivateResponses.data = donePrivateResponse;

                const deleteDonePrivateResponses = await axios({
                    headers: {
                        Authorization: "Bearer " + localStorage.getItem("jwt"),
                    },
                    method: 'POST',
                    url: 'http://localhost:3000/private/globalListRatings/' + responseTitle,
                    data: getDonePrivateResponses
                });
        }

        allPublicLists.data = allPublicLists.data.result;

        const updatePublicLists = await axios({
            method: 'POST',
            url: 'http://localhost:3000/public/listsToSort',
            data: allPublicLists
        });

    });

    $("#saveImage").on("click", function () {
        domtoimage.toBlob(document.getElementById('resultsTable'))
            .then(function (blob) {
                window.saveAs(blob, 'My ' + $("#optionsDiv").attr("name") + ' Rankings.png');
            });
    });

    $("body").on("click", ".buttonListItem", function (e) {
        $("#optionsDiv").attr("name", $(e.target).closest(".buttonListItem").find(".listItemName").html());
        $("#selectListOption").modal();
    });

    $("#viewYourRatingsButton").on("click", async function () {
        for (listDone in profileListsDone.data.result) {
            if (listDone === $("#optionsDiv").attr("name")) {
                displayRankingModal($("#optionsDiv").attr("name"), profileListsDone.data.result[listDone]);
            }
        }

    });

    $("#viewGlobalRatingsButton").on("click", async function () {
        try {
            const globalData = await axios({
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("jwt"),
                },
                method: 'GET',
                url: 'http://localhost:3000/private/globalListRatings/' + $("#optionsDiv").attr("name"),
            });

            $("#minAge").off();
            $("#maxAge").off();
            $("#anyGenderFilter").off();
            $("#menFilter").off();
            $("#womenFilter").off();

            $("#minAge").on("change paste keyup", function () {
                displayGlobalRankingModal(globalData, $("#optionsDiv").attr("name"));
            });
            $("#maxAge").on("change paste keyup", function () {
                displayGlobalRankingModal(globalData, $("#optionsDiv").attr("name"));
            });
            $("#anyGenderFilter").on("click", function () {
                displayGlobalRankingModal(globalData, $("#optionsDiv").attr("name"));
            });
            $("#menFilter").on("click", function () {
                displayGlobalRankingModal(globalData, $("#optionsDiv").attr("name"));
            });
            $("#womenFilter").on("click", function () {
                displayGlobalRankingModal(globalData, $("#optionsDiv").attr("name"));
            });

            $("#selectListOption").modal("hide");
            displayGlobalRankingModal(globalData, $("#optionsDiv").attr("name"));
        } catch (error) {
            $("#viewGlobalRatingsButton")[0].classList.add("unfinished");
            $("#viewGlobalRatingsButton").text("No Global Ratings");
            setTimeout(function () {
                $("#viewGlobalRatingsButton")[0].classList.remove("unfinished");
                $("#viewGlobalRatingsButton").text("View Global Ratings");
            }, 3000);
        }
    });

    createListItems(profileListsDone.data.result, allPublicLists.data.result);
});

function displayRankingModal(listName, sortedList) {
    $("#selectListOption").modal("hide");
    $("#rankingHeader").empty();
    $("#rankingRows").empty();

    $("#rankingHeader").append(
        '<tr>' +
        '<th scope="col">#</th>' +
        '<th scope="col">' + listName + ' - Rankings</th>' +
        '</tr>'
    )

    for (let i = 0; i < sortedList.length; i++) {
        $("#rankingRows").append(
            '<tr>' +
            '<th scope="row">' + (i + 1) + '</th>' +
            '<td>' + sortedList[i].name + '</td>' +
            '</tr>'
        )
    }
    setTimeout(function () {
        $("#resultsModal").modal();
    }, 320);
}

function displayGlobalRankingModal(globalRanking, listName) {

    $("#globalHeader").empty();
    $("#globalRows").empty();

    $("#globalHeader").append(
        '<tr>' +
        '<th scope="col">Overall</th>' +
        '<th scope="col">Average</th>' +
        '<th scope="col">' + listName + '</th>' +
        '</tr>'
    )

    // If any of the filters are selected
    if (!$("#anyGenderFilter").prop("checked") || $("#minAge").val() !== "" || $("#maxAge").val() !== "") {
        let personalRatings = globalRanking.data.result.individualRatings;

        let today = new Date();

        let filteredPeople = personalRatings.filter(function (person) {
            let birthdate = new Date(person.birthdate);

            let age = Math.floor((today - birthdate) / (365.25 * 24 * 60 * 60 * 1000));

            if (!isNaN($("#minAge").val()) && $("#minAge").val().length > 0 && $("#minAge").val() > age) {
                return false;
            } else if (!isNaN($("#maxAge").val()) && $("#maxAge").val().length > 0 && $("#maxAge").val() < age) {
                return false;
            } else if ((person.gender === "Male" && $("#womenFilter").prop("checked")) || (person.gender === "Female" && $("#menFilter").prop("checked"))) {
                return false;
            } else {
                return true;
            }
        });

        let numPeople = filteredPeople.length;

        let filteredRankings = [];
        for (let i = 0; i < globalRanking.data.result.items.length; i++) {
            let item = globalRanking.data.result.items[i].name;

            // Adds up the rankings for each item from each filtered person
            let totalItemRanking = filteredPeople.reduce(function (reducer, filteredPerson) {
                let itemRating = filteredPerson.rankings.find(function (itemRanking) {
                    return itemRanking.name === item;
                });
                return reducer + itemRating.rating;
            }, 0);

            // Creates an array of arrays, with [0] being the name of the item and [1] being the average rank
            filteredRankings[i] = [globalRanking.data.result.items[i].name, totalItemRanking / numPeople];
        }

        let sortedFilteredRankings = filteredRankings.sort(function (itemA, itemB) {
            return itemA[1] - itemB[1];
        });

        $("#numberOfRankings").text(numPeople);

        if (numPeople === 0) {
            $("#globalHeader").empty();
            $("#globalHeader").append("<h1>No rankings to display</h1>")
        } else {
            for (let i = 0; i < sortedFilteredRankings.length; i++) {
                $("#globalRows").append(
                    '<tr>' +
                    '<th scope="row">' + (i + 1) + '</th>' +
                    '<td>' + sortedFilteredRankings[i][1].toFixed(2) + '</td>' +
                    '<td>' + sortedFilteredRankings[i][0] + '</td>' +
                    '</tr>'
                )
            }
        }
    }

    // If no filters are selected
    else {
        let sortedGlobalRankings = globalRanking.data.result.items.sort(function (itemA, itemB) {
            return itemA.averageRating - itemB.averageRating;
        })

        $("#numberOfRankings").text(globalRanking.data.result.timesUsed);

        for (let i = 0; i < sortedGlobalRankings.length; i++) {
            $("#globalRows").append(
                '<tr>' +
                '<th scope="row">' + (i + 1) + '</th>' +
                '<td>' + sortedGlobalRankings[i].averageRating.toFixed(2) + '</td>' +
                '<td>' + sortedGlobalRankings[i].name + '</td>' +
                '</tr>'
            )
        }
    }
    setTimeout(function () {
        $("#globalRatingsModal").modal();
    }, 320);
}

function replaceLoginSignup() {
    $("#loginButtons").empty();
    $("#loginButtons").append("<p class='navbar-brand m-0'>Logged in as: <span id='usernameLink'>" + localStorage.getItem("username") + "</span></p>");
}

function createListItems(yourLists, allPublicLists) {

    $("#profileListContainer").empty();

    let doneListsFromPublic = allPublicLists.filter(function (list) {
        for (yourList in yourLists) {
            if (list.name === yourList) {
                return true;
            }
        }
    });

    for (let i = 0; i < doneListsFromPublic.length; i++) {
        let $item = $(
            '<div class="listItem col-12 col-md-6 col-xl-3">' +
            '<button type="button" data-toggle="tooltip" data-placement="top" title="' + doneListsFromPublic[i].name + '" class="category btn btn-outline-dark buttonListItem">' +
            '<img src="' + doneListsFromPublic[i].img + '">' +
            '<h5 class="listItemName">' + doneListsFromPublic[i].name + '</h5>' +
            '</button>' +
            '</div>');
        $("#profileListContainer").append($item);
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

function setProfileDetails(profile) {
    $("#usernameText").text(profile.data.user.name)
    $("#genderText").text(profile.data.user.data.gender)
    $("#dateOfBirthText").text(profile.data.user.data.birthdate)
}