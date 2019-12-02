$(document).ready(async function () {
    const publicRoot = new axios.create({
        baseURL: "http://localhost:3000/public"
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