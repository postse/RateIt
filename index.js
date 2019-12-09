$(document).ready(async function () {
    const publicRoot = new axios.create({
        baseURL: "http://localhost:3000/public"
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
        return await publicRoot.get("/listsToSort")
    }

    let lists = await getListsToSort();
    populateFromPublicLists(lists.data.result);
});

function populateFromPublicLists(lists) {
    for (let i = 0; i < lists.length; i++) {
        let $item = $(
            '<div class="listItem col-12 col-md-6 col-xl-3">' +
            '<button type="button" class="category btn btn-outline-dark">' +
            '<img src="' + lists[i].img + '">' +
            '<h5 class="listItemName">' + lists[i].name + '</h5>' +
            '</button>' +
            '</div>');
        $("#listItems").append($item);
    }
    $("body").on("click", ".listItem", function(e) {
        let clickedListName = $(e.target).closest(".listItem").find(".listItemName").html();
        window.location.href = 'selectionScreen.html#' + clickedListName;
    })
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