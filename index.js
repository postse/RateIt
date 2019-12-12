$(document).ready(async function () {
    let personalRankingList = decodeURI(window.location.hash.substring(1));

    const publicRoot = new axios.create({
        baseURL: "http://localhost:3000"
    });

    if (localStorage.getItem("username") !== null) {
        replaceLoginSignup();
    }

    $("#resultsModal").on("hide.bs.modal", function() {
        window.history.replaceState({}, "", "index.html#");
    });

    $("body").on("click", "#usernameLink", function() {
        window.location.href = "login.html"
    });

    $("#saveImage").on("click", function () {
        domtoimage.toBlob(document.getElementById('resultsTable'))
            .then(function (blob) {
                window.saveAs(blob, 'My ' + decodeURI(window.location.hash.substring(1)) + ' Rankings.png');
            });
    });

    $("body").on("click", "#signup-btn", async function () {
        let user = $("#username-sign").val();
        let pass = $("#password-sign").val();
        let gender = $("#gender").val();
        let date = $("#birthdate").val();
        var year = new Date(date).getFullYear();

        if (user == "" || pass == "" || year == "") {
            return;
        }
        await addUser(user, pass, gender, date);
        await createUserJson(user);
    });

    $("body").on("click", "#login-btn", function () {
        let user = $("#username-login").val();
        let pass = $("#password-login").val();
        login(user, pass);
    });

    $("body").on("click", "#test", function () {
        createUserJson(localStorage.getItem("username"));
    });

    async function getListsToSort() {
        return await publicRoot.get("/public/listsToSort")
    }

    async function createList(category) {
        return await publicRoot.post(`/public/listsToSort`, {
            "data": category,
            "type": "merge"
        });
    }

    let lists = await getListsToSort();

    $("body").on("click", ".buttonListItem", async function (e) {
        let status = await getStatus();

        if (status === 401) {
            $(e.target).closest(".buttonListItem")[0].classList.add("unfinished");

            let itemText = $(e.target).closest(".buttonListItem").find(".listItemName").text();
            $(e.target).closest(".buttonListItem").find(".listItemName").text("Log in required");
            setTimeout(function () {
                $(e.target).closest(".buttonListItem")[0].classList.remove("unfinished");
                $(e.target).closest(".buttonListItem").find(".listItemName").text(itemText);
            }, 2000);
        } else if (status.status === 200) {
            $("#optionsDiv").attr("name", $(e.target).closest(".buttonListItem").find(".listItemName").html());
            $("#selectListOption").modal();
        }
    });

    $("#rateItButton").on("click", async function () {
        $("#rateItButton").off();
        window.location.href = 'selectionScreen.html#' + $("#optionsDiv").attr("name");
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

    populateFromPublicLists(lists.data.result);

    let listNames = lists.data.result.map(function (item) {
        return item.name;
    });

    createAutocomplete(listNames, lists.data.result);

    $("#addItemButton").on("click", function () {
        let itemNumber = $(".item").length + 1;
        $("#items").append(
            '<div class="item">' +
            '<h5 class="mb1">Item ' + itemNumber + ' *</h5>' +
            '<input type="text" class="form-control mb-4 itemText" aria-label="CategoryItem" required>' +
            '</div>'
        )
        $(".item").last().find("input").focus();
    });

    $("#removeItemButton").on("click", function () {
        let listSize = $(".item").length;
        if (listSize > 1) {
            $("#items").find(".item").last().remove();
        }
    });

    $("#submitCategoryButton").on("click", async function (e) {
        e.preventDefault();
        let finished = true;

        for (let i = 0; i < $("#submitForm").find("input").length; i++) {
            // only validate the inputs that have the required attribute
            if ($("#submitForm").find("input")[i].value === "" && $("#submitForm").find("input")[i].hasAttribute("required")) {
                $("#submitForm").find("input")[i].classList.add("unfinished");
                setTimeout(function () {
                    $("#submitForm").find("input")[i].classList.remove("unfinished");
                }, 3000);
                finished = false;
            }
        }

        if ($(".item").length < 4) {
            finished = false;
        }

        if (finished) {
            let items = [];
            for (let i = 0; i < $(".itemText").length; i++) {
                items.push({
                    "name": $(".itemText")[i].value,
                });
            }

            $("#submitCategoryButton").text("Creating...");
            $("#submitCategoryButton").attr("disabled", true);

            let dateCreated = new Date().toISOString();

            let img = await getCompressedImgurImage($("#categoryImage").val());

            let criteria = $("#categoryCriteria").val();

            let name = $("#categoryTitle").val();

            let category = {
                "name": name,
                "items": items,
                "timesRated": 0,
                "img": img,
                "criteria": criteria,
                "dateCreated": dateCreated
            }

            createList(category);

            location.reload();

        } else {
            $("#submitCategoryButton").text("Form Incomplete");
            setTimeout(function () {
                $("#submitCategoryButton").text("Submit Category");
            }, 3000);
        }
    });


    // Adds new item if enter is pressed and last item is focused
    $(document).on('keypress', function (e) {
        if (e.which == 13) {
            e.preventDefault();
            if ($(".item").find("input").is(":focus")) {
                let itemNumber = $(".item").length + 1;
                $("#items").append(
                    '<div class="item">' +
                    '<h5 class="mb1">Item ' + itemNumber + ' *</h5>' +
                    '<input type="text" class="form-control mb-4 itemText" aria-label="CategoryItem" required>' +
                    '</div>'
                )
                $(".item").last().find("input").focus();
            }
        }
    });

    if (personalRankingList.length !== 0) {
        const response = await axios({
            headers: {
                Authorization: "Bearer " + localStorage.getItem("jwt"),
            },
            method: 'GET',
            url: 'http://localhost:3000/user/' + localStorage.getItem("username") + '/responses/' + personalRankingList,
        });

        displayRankingModal(personalRankingList, response.data.result)
    }

});

function replaceLoginSignup() {
    $("#loginButtons").empty();
    $("#loginButtons").append("<p class='navbar-brand m-0'>Logged in as: <span id='usernameLink'>" + localStorage.getItem("username") + "</span></p>");
}

function displayRankingModal(listName, sortedList) {
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
    $("#resultsModal").modal();
}

function populateFromPublicLists(lists) {

    $("#listItems").empty();

    let sortedList;

    if ($("#radioMostPopularSort").is(":checked")) {
        sortedList = lists.sort(function (a, b) {
            return b.timesRated - a.timesRated;
        });
    } else {
        sortedList = lists.sort(function (a, b) {
            let dateA = new Date(a.dateCreated);
            let dateB = new Date(b.dateCreated);
            return dateB - dateA;
        });
    }

    for (let i = 0; i < lists.length; i++) {
        let $item = $(
            '<div class="listItem col-12 col-md-6 col-xl-3">' +
            '<button type="button" data-toggle="tooltip" data-placement="top" title="' + lists[i].name + '" class="category btn btn-outline-dark buttonListItem">' +
            '<img src="' + lists[i].img + '">' +
            '<h5 class="listItemName">' + lists[i].name + '</h5>' +
            '</button>' +
            '</div>');
        $("#listItems").append($item);
    }
}

function createAutocomplete(listNames, completeLists) {

    $("#categoryChooser").on("input", debounce(function () {
        let text = $("#categoryChooser").val();

        if (text.length !== 0) {
            getList(text).then((list) => {
                populateAutocomplete(list, completeLists);
            }).catch(error => console.warn(error));
        } else {
            $("#listItems").empty();
            populateFromPublicLists(completeLists);
        }
    }, 250));

    $("#radioMostPopularSort").on("click", debounce(function () {
        let text = $("#categoryChooser").val();

        if (text.length !== 0) {
            getList(text).then((list) => {
                populateAutocomplete(list, completeLists);
            }).catch(error => console.warn(error));
        } else {
            $("#listItems").empty();
            populateFromPublicLists(completeLists);
        }
    }, 0));

    $("#radioNewSort").on("click", debounce(function () {
        let text = $("#categoryChooser").val();

        if (text.length !== 0) {
            getList(text).then((list) => {
                populateAutocomplete(list, completeLists);
            }).catch(error => console.warn(error));
        } else {
            $("#listItems").empty();
            populateFromPublicLists(completeLists);
        }
    }, 0));

    localStorage.setItem("itemsToDebounce", JSON.stringify(listNames));
}

function getList(text) {
    return new Promise((resolve, reject) => {
        let parser = (function () {
            let t = this.toString();
            let pattern = new RegExp(t, "i");
            let terms = JSON.parse(localStorage.getItem("itemsToDebounce"));
            let matches = terms.filter(term => pattern.test(term));
            resolve(matches);
        }).bind(text);

        parser();
    });
}

// debounce algorithm - modified from David Walsh
function debounce(func, wait, immediate) {
    let timeout;

    return function toExecute() {
        let context = this;
        let args = arguments;

        let callNow = immediate && !timeout;

        clearTimeout(timeout);

        timeout = setTimeout(function () {
            timeout = null;
            if (!immediate) {
                func.apply(context, args);
            }
        }, wait);

        if (callNow) {
            func.apply(context, args);
        }
    }
}

function populateAutocomplete(list, completeLists) {
    let autocompleteList = completeLists.filter(function (allLists) {
        return list.includes(allLists.name);
    })

    $("#listItems").empty();

    let sortedList;

    if ($("#radioMostPopularSort").is(":checked")) {
        sortedList = autocompleteList.sort(function (a, b) {
            return b.timesRated - a.timesRated;
        });
    } else {
        sortedList = autocompleteList.sort(function (a, b) {
            let dateA = new Date(a.dateCreated);
            let dateB = new Date(b.dateCreated);
            return dateB - dateA;
        });
    }

    for (let i = 0; i < autocompleteList.length; i++) {
        let $item = $(
            '<div class="listItem col-12 col-md-6 col-xl-3">' +
            '<button type="button" data-toggle="tooltip" data-placement="top" title="' + autocompleteList[i].name + '" class="category btn btn-outline-dark buttonListItem">' +
            '<img src="' + autocompleteList[i].img + '">' +
            '<h5 class="listItemName">' + autocompleteList[i].name + '</h5>' +
            '</button>' +
            '</div>');
        $("#listItems").append($item);
    }
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

async function getCompressedImgurImage(imageURL) {

    let imgurImage = await axios({
        "url": 'https://api.imgur.com/3/image',
        "headers": {
            "Authorization": "Client-ID 2f8774103aa2030",
        },
        "method": 'post',
        "data": {
            "image": imageURL
        }
    });

    return imgurImage.data.data.link;
}

async function addUser(user, password, gender, date) {
    const response = await axios({
        method: 'POST',
        url: 'http://localhost:3000/account/create',
        data: {
            "name": user,
            "pass": password,
            "data": {
                "gender": gender,
                "birthdate": date
            }
        }
    });
    if (response.status == 200) {
        $("[data-dismiss=modal]").trigger({ type: "click" });
        //$("#signup-info").text = response.data.status;
    }
    await login(user, password);
}



async function createUserJson(user) {
    let jsonObject = JSON.parse('{}');
    jsonObject.data = JSON.parse('{"responses": {}}')

    const response = await axios({
        headers: {
            Authorization: "Bearer " + localStorage.getItem("jwt"),
        },
        method: 'POST',
        url: 'http://localhost:3000/user/' + user,
        data: jsonObject
    });
}

async function login(user, password) {
    const response = await axios({
        method: 'POST',
        url: 'http://localhost:3000/account/login',
        data: {
            "name": user,
            "pass": password,
        }
    })

    if (response.status == 200) {
        localStorage.setItem("username", response.data.name);
        localStorage.setItem("jwt", response.data.jwt);
        $("[data-dismiss=modal]").trigger({ type: "click" });
    }

    replaceLoginSignup();
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