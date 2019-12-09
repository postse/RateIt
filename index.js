$(document).ready(async function () {
    const publicRoot = new axios.create({
        baseURL: "http://localhost:3000"
    });

    $("body").on("click", "#signup-btn", function() {
        let user = $("#username-sign").val();
        let pass = $("#password-sign").val();
        let gender = $("#gender").val();
        let date = $("#birthdate").val();
        addUser(user, pass, gender, date);
    });

    $("body").on("click", "#login-btn", function() {
        let user = $("#username-login").val();
        let pass = $("#password-login").val();
        login(user, pass);
    });

    $("body").on("click", "#test", function() {
        getStatus();
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

    $("body").on("click", ".listItem", function (e) {
        let clickedListName = $(e.target).closest(".listItem").find(".listItemName").html();
        window.location.href = 'selectionScreen.html#' + clickedListName;
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
                    "img": null
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

});

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
            '<button type="button" data-toggle="tooltip" data-placement="top" title="' + lists[i].name + '" class="category btn btn-outline-dark">' +
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
    }, 100));

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
            '<button type="button" data-toggle="tooltip" data-placement="top" title="' + autocompleteList[i].name + '" class="category btn btn-outline-dark">' +
            '<img src="' + autocompleteList[i].img + '">' +
            '<h5 class="listItemName">' + autocompleteList[i].name + '</h5>' +
            '</button>' +
            '</div>');
        $("#listItems").append($item);
    }
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
    console.log(response);
    if (response.status == 200) {
        localStorage.setItem("jwt", response.data.jwt);
        $("[data-dismiss=modal]").trigger({ type: "click" });
    }
}

async function getStatus() {
    const response = await axios({
        headers: {
            Authorization: "Bearer " + localStorage.getItem("jwt"),
        },
        method: 'GET',
        url: 'http://localhost:3000/account/status',
    });
    console.log(response);
}